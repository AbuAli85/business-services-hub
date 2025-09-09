import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getSupabaseClient } from '@/lib/supabase'
import { headers } from 'next/headers'
import { triggerPaymentReceived, triggerPaymentFailed } from '@/lib/notification-triggers-simple'

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
})

export async function POST(request: NextRequest) {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    const supabase = await getSupabaseClient()

    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object as Stripe.PaymentIntent, supabase)
        break

      case 'payment_intent.payment_failed':
        await handlePaymentFailure(event.data.object as Stripe.PaymentIntent, supabase)
        break

      case 'payment_intent.canceled':
        await handlePaymentCanceled(event.data.object as Stripe.PaymentIntent, supabase)
        break

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSuccess(event.data.object as Stripe.Invoice, supabase)
        break

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailure(event.data.object as Stripe.Invoice, supabase)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent, supabase: any) {
  const { booking_id, client_id, provider_id, service_title } = paymentIntent.metadata

  if (!booking_id) {
    console.error('No booking_id in payment intent metadata')
    return
  }

  // Update booking status
  const { error: bookingError } = await supabase
    .from('bookings')
    .update({ 
      payment_status: 'paid',
      status: 'approved',
      operational_status: 'approved',
      updated_at: new Date().toISOString()
    })
    .eq('id', booking_id)

  if (bookingError) {
    console.error('Error updating booking:', bookingError)
  }

  // Update payment record
  const { error: paymentError } = await supabase
    .from('payments')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString()
    })
    .eq('stripe_payment_intent_id', paymentIntent.id)

  if (paymentError) {
    console.error('Error updating payment:', paymentError)
  }

  // Create invoice
  const { error: invoiceError } = await supabase
    .from('invoices')
    .insert({
      booking_id,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency.toUpperCase(),
      status: 'paid',
      stripe_payment_intent_id: paymentIntent.id,
      paid_at: new Date().toISOString(),
      invoice_number: `INV-${Date.now()}`,
      client_id,
      provider_id,
      service_title
    })

  if (invoiceError) {
    console.error('Error creating invoice:', invoiceError)
  }

  // Send payment notifications to both client and provider
  try {
    await triggerPaymentReceived(paymentIntent.id, {
      booking_id: booking_id,
      client_id: client_id,
      provider_id: provider_id,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency.toUpperCase(),
      payment_method: 'stripe',
      transaction_id: paymentIntent.id,
      service_name: service_title
    })
  } catch (notificationError) {
    console.warn('Failed to send payment notifications:', notificationError)
    // Non-blocking - don't fail the payment processing if notifications fail
  }

  console.log(`Payment successful for booking ${booking_id}`)
}

async function handlePaymentFailure(paymentIntent: Stripe.PaymentIntent, supabase: any) {
  const { booking_id, client_id, service_title } = paymentIntent.metadata

  if (!booking_id) return

  // Update booking status
  await supabase
    .from('bookings')
    .update({ 
      payment_status: 'failed',
      status: 'pending',
      updated_at: new Date().toISOString()
    })
    .eq('id', booking_id)

  // Update payment record
  await supabase
    .from('payments')
    .update({
      status: 'failed',
      failed_at: new Date().toISOString()
    })
    .eq('stripe_payment_intent_id', paymentIntent.id)

  // Send payment failure notification
  try {
    await triggerPaymentFailed(paymentIntent.id, {
      booking_id: booking_id,
      client_id: client_id,
      provider_id: paymentIntent.metadata.provider_id,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency.toUpperCase(),
      error_message: 'Payment processing failed',
      service_name: service_title
    })
  } catch (notificationError) {
    console.warn('Failed to send payment failure notification:', notificationError)
    // Non-blocking - don't fail the payment processing if notifications fail
  }

  console.log(`Payment failed for booking ${booking_id}`)
}

async function handlePaymentCanceled(paymentIntent: Stripe.PaymentIntent, supabase: any) {
  const { booking_id, client_id, service_title } = paymentIntent.metadata

  if (!booking_id) return

  // Update booking status
  await supabase
    .from('bookings')
    .update({ 
      payment_status: 'cancelled',
      status: 'cancelled',
      updated_at: new Date().toISOString()
    })
    .eq('id', booking_id)

  // Update payment record
  await supabase
    .from('payments')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString()
    })
    .eq('stripe_payment_intent_id', paymentIntent.id)

  // Notify client
  if (client_id) {
    await supabase.from('notifications').insert({
      user_id: client_id,
      type: 'payment',
      title: 'Payment Cancelled',
      message: `Payment cancelled for ${service_title}`,
      metadata: { booking_id },
      priority: 'medium'
    })
  }

  console.log(`Payment cancelled for booking ${booking_id}`)
}

async function handleInvoicePaymentSuccess(invoice: Stripe.Invoice, supabase: any) {
  // Handle subscription or recurring payment success
  console.log(`Invoice payment succeeded: ${invoice.id}`)
}

async function handleInvoicePaymentFailure(invoice: Stripe.Invoice, supabase: any) {
  // Handle subscription or recurring payment failure
  console.log(`Invoice payment failed: ${invoice.id}`)
}
