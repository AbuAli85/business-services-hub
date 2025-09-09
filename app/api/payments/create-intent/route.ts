import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getSupabaseClient } from '@/lib/supabase'
import { z } from 'zod'

import { triggerPaymentReceived, triggerPaymentFailed } from '@/lib/notification-triggers-simple'
// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
})

// Validation schema
const CreatePaymentIntentSchema = z.object({
  booking_id: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.enum(['OMR', 'USD', 'EUR']).default('OMR'),
  description: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate request body
    const validationResult = CreatePaymentIntentSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Invalid request data', 
        details: validationResult.error.errors 
      }, { status: 400 })
    }

    const { booking_id, amount, currency, description } = validationResult.data

    // Validate booking exists and belongs to user
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        services(title, description)
      `)
      .eq('id', booking_id)
      .eq('client_id', user.id)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Invalid booking' }, { status: 404 })
    }

    // Get client and provider profiles separately
    const { data: clientProfile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single()

    const { data: providerProfile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', booking.provider_id)
      .single()

    // Check if booking is already paid
    if (booking.payment_status === 'paid') {
      return NextResponse.json({ error: 'Booking is already paid' }, { status: 400 })
    }

    // Check if amount matches booking amount
    if (Math.abs(booking.amount - amount) > 0.01) {
      return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 })
    }

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      metadata: {
        booking_id,
        client_id: user.id,
        provider_id: booking.provider_id,
        service_title: booking.services.title,
        client_email: clientProfile?.email || user.email,
        provider_email: providerProfile?.email || 'Unknown'
      },
      description: description || `Payment for ${booking.services.title}`,
      automatic_payment_methods: {
        enabled: true,
      },
      receipt_email: user.email,
    })

    // Update booking with payment intent
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ 
        stripe_payment_intent_id: paymentIntent.id,
        payment_status: 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('id', booking_id)

    if (updateError) {
      console.error('Error updating booking with payment intent:', updateError)
      // Don't fail the payment intent creation, but log the error
    }

    // Create payment record
    await supabase.from('payments').insert({
      booking_id,
      amount,
      currency,
      stripe_payment_intent_id: paymentIntent.id,
      status: 'pending',
      created_at: new Date().toISOString()
    })

    return NextResponse.json({ 
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency.toUpperCase()
    })

  } catch (error) {
    console.error('Payment intent creation error:', error)
    
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json({ 
        error: 'Payment setup failed', 
        details: error.message 
      }, { status: 400 })
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
