import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import * as XLSX from 'xlsx'

export interface ExportData {
  booking: {
    id: string
    title: string
    status: string
    created_at: string
    amount: number
    currency: string
    client: {
      full_name: string
      email: string
      company_name?: string
    }
    provider: {
      full_name: string
      email: string
      company_name?: string
    }
  }
  tasks: Array<{
    id: string
    title: string
    description?: string
    status: string
    priority: string
    due_date?: string
    completed_at?: string
    is_overdue: boolean
    weight: number
  }>
  milestones: Array<{
    id: string
    title: string
    description?: string
    status: string
    due_date?: string
    created_at: string
  }>
  stats: {
    totalTasks: number
    completedTasks: number
    overdueTasks: number
    overallProgress: number
  }
}

export async function generatePDF(data: ExportData): Promise<Blob> {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595.28, 841.89]) // A4 size
  const { width, height } = page.getSize()

  // Load fonts
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  let yPosition = height - 50

  // Helper function to add text
  const addText = (text: string, x: number, y: number, fontSize: number = 12, isBold: boolean = false) => {
    page.drawText(text, {
      x,
      y,
      size: fontSize,
      font: isBold ? boldFont : font,
      color: rgb(0, 0, 0),
    })
  }

  // Helper function to add line
  const addLine = (x1: number, y1: number, x2: number, y2: number) => {
    page.drawLine({
      start: { x: x1, y: y1 },
      end: { x: x2, y: y2 },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    })
  }

  // Header
  addText('PROJECT PROGRESS REPORT', 50, yPosition, 20, true)
  yPosition -= 30

  addText(`Booking ID: ${data.booking.id}`, 50, yPosition, 12)
  yPosition -= 20
  addText(`Generated: ${new Date().toLocaleDateString()}`, 50, yPosition, 12)
  yPosition -= 40

  // Project Overview
  addText('PROJECT OVERVIEW', 50, yPosition, 16, true)
  yPosition -= 25

  addText(`Title: ${data.booking.title}`, 50, yPosition, 12)
  yPosition -= 20
  addText(`Status: ${data.booking.status.toUpperCase()}`, 50, yPosition, 12)
  yPosition -= 20
  addText(`Amount: ${data.booking.currency} ${data.booking.amount}`, 50, yPosition, 12)
  yPosition -= 20
  addText(`Created: ${new Date(data.booking.created_at).toLocaleDateString()}`, 50, yPosition, 12)
  yPosition -= 30

  // Client & Provider Info
  addText('PARTICIPANTS', 50, yPosition, 16, true)
  yPosition -= 25

  addText(`Client: ${data.booking.client.full_name}`, 50, yPosition, 12)
  yPosition -= 15
  addText(`Email: ${data.booking.client.email}`, 50, yPosition, 12)
  if (data.booking.client.company_name) {
    yPosition -= 15
    addText(`Company: ${data.booking.client.company_name}`, 50, yPosition, 12)
  }
  yPosition -= 20

  addText(`Provider: ${data.booking.provider.full_name}`, 50, yPosition, 12)
  yPosition -= 15
  addText(`Email: ${data.booking.provider.email}`, 50, yPosition, 12)
  if (data.booking.provider.company_name) {
    yPosition -= 15
    addText(`Company: ${data.booking.provider.company_name}`, 50, yPosition, 12)
  }
  yPosition -= 30

  // Progress Statistics
  addText('PROGRESS STATISTICS', 50, yPosition, 16, true)
  yPosition -= 25

  addText(`Total Tasks: ${data.stats.totalTasks}`, 50, yPosition, 12)
  yPosition -= 20
  addText(`Completed Tasks: ${data.stats.completedTasks}`, 50, yPosition, 12)
  yPosition -= 20
  addText(`Overdue Tasks: ${data.stats.overdueTasks}`, 50, yPosition, 12)
  yPosition -= 20
  addText(`Overall Progress: ${data.stats.overallProgress}%`, 50, yPosition, 12)
  yPosition -= 40

  // Tasks Section
  if (data.tasks.length > 0) {
    addText('TASKS', 50, yPosition, 16, true)
    yPosition -= 25

    data.tasks.forEach((task, index) => {
      if (yPosition < 100) {
        // Add new page if needed
        const newPage = pdfDoc.addPage([595.28, 841.89])
        page.drawText('TASKS (continued)', {
          x: 50,
          y: newPage.getHeight() - 50,
          size: 16,
          font: boldFont,
          color: rgb(0, 0, 0),
        })
        yPosition = newPage.getHeight() - 80
      }

      addText(`${index + 1}. ${task.title}`, 50, yPosition, 12, true)
      yPosition -= 15

      if (task.description) {
        const description = task.description.length > 80 
          ? task.description.substring(0, 80) + '...' 
          : task.description
        addText(`   ${description}`, 50, yPosition, 10)
        yPosition -= 15
      }

      addText(`   Status: ${task.status.toUpperCase()}`, 50, yPosition, 10)
      yPosition -= 12
      addText(`   Priority: ${task.priority.toUpperCase()}`, 50, yPosition, 10)
      yPosition -= 12
      
      if (task.due_date) {
        addText(`   Due: ${new Date(task.due_date).toLocaleDateString()}`, 50, yPosition, 10)
        yPosition -= 12
      }

      if (task.is_overdue) {
        addText(`   ⚠️ OVERDUE`, 50, yPosition, 10)
        yPosition -= 12
      }

      yPosition -= 20
    })
  }

  // Milestones Section
  if (data.milestones.length > 0) {
    if (yPosition < 100) {
      const newPage = pdfDoc.addPage([595.28, 841.89])
      yPosition = newPage.getHeight() - 50
    }

    addText('MILESTONES', 50, yPosition, 16, true)
    yPosition -= 25

    data.milestones.forEach((milestone, index) => {
      if (yPosition < 100) {
        const newPage = pdfDoc.addPage([595.28, 841.89])
        yPosition = newPage.getHeight() - 50
      }

      addText(`${index + 1}. ${milestone.title}`, 50, yPosition, 12, true)
      yPosition -= 15

      if (milestone.description) {
        const description = milestone.description.length > 80 
          ? milestone.description.substring(0, 80) + '...' 
          : milestone.description
        addText(`   ${description}`, 50, yPosition, 10)
        yPosition -= 15
      }

      addText(`   Status: ${milestone.status.toUpperCase()}`, 50, yPosition, 10)
      yPosition -= 12

      if (milestone.due_date) {
        addText(`   Due: ${new Date(milestone.due_date).toLocaleDateString()}`, 50, yPosition, 10)
        yPosition -= 12
      }

      yPosition -= 20
    })
  }

  // Footer
  const lastPage = pdfDoc.getPages()[pdfDoc.getPages().length - 1]
  lastPage.drawText(`Generated by Business Services Hub - ${new Date().toLocaleString()}`, {
    x: 50,
    y: 50,
    size: 10,
    font: font,
    color: rgb(0.5, 0.5, 0.5),
  })

  const pdfBytes = await pdfDoc.save()
  return new Blob([pdfBytes], { type: 'application/pdf' })
}

export function generateExcel(data: ExportData): Blob {
  // Create workbook
  const workbook = XLSX.utils.book_new()

  // Project Overview Sheet
  const overviewData = [
    ['Project Progress Report'],
    [''],
    ['Booking ID', data.booking.id],
    ['Title', data.booking.title],
    ['Status', data.booking.status.toUpperCase()],
    ['Amount', `${data.booking.currency} ${data.booking.amount}`],
    ['Created', new Date(data.booking.created_at).toLocaleDateString()],
    ['Generated', new Date().toLocaleDateString()],
    [''],
    ['Client Information'],
    ['Name', data.booking.client.full_name],
    ['Email', data.booking.client.email],
    ['Company', data.booking.client.company_name || 'N/A'],
    [''],
    ['Provider Information'],
    ['Name', data.booking.provider.full_name],
    ['Email', data.booking.provider.email],
    ['Company', data.booking.provider.company_name || 'N/A'],
    [''],
    ['Progress Statistics'],
    ['Total Tasks', data.stats.totalTasks],
    ['Completed Tasks', data.stats.completedTasks],
    ['Overdue Tasks', data.stats.overdueTasks],
    ['Overall Progress', `${data.stats.overallProgress}%`],
  ]

  const overviewSheet = XLSX.utils.aoa_to_sheet(overviewData)
  XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Overview')

  // Tasks Sheet
  if (data.tasks.length > 0) {
    const tasksData = [
      ['Task ID', 'Title', 'Description', 'Status', 'Priority', 'Due Date', 'Completed At', 'Overdue', 'Weight'],
      ...data.tasks.map(task => [
        task.id,
        task.title,
        task.description || '',
        task.status.toUpperCase(),
        task.priority.toUpperCase(),
        task.due_date ? new Date(task.due_date).toLocaleDateString() : '',
        task.completed_at ? new Date(task.completed_at).toLocaleDateString() : '',
        task.is_overdue ? 'YES' : 'NO',
        task.weight
      ])
    ]

    const tasksSheet = XLSX.utils.aoa_to_sheet(tasksData)
    XLSX.utils.book_append_sheet(workbook, tasksSheet, 'Tasks')
  }

  // Milestones Sheet
  if (data.milestones.length > 0) {
    const milestonesData = [
      ['Milestone ID', 'Title', 'Description', 'Status', 'Due Date', 'Created At'],
      ...data.milestones.map(milestone => [
        milestone.id,
        milestone.title,
        milestone.description || '',
        milestone.status.toUpperCase(),
        milestone.due_date ? new Date(milestone.due_date).toLocaleDateString() : '',
        new Date(milestone.created_at).toLocaleDateString()
      ])
    ]

    const milestonesSheet = XLSX.utils.aoa_to_sheet(milestonesData)
    XLSX.utils.book_append_sheet(workbook, milestonesSheet, 'Milestones')
  }

  // Summary Sheet
  const summaryData = [
    ['PROJECT SUMMARY'],
    [''],
    ['Metric', 'Value'],
    ['Total Tasks', data.stats.totalTasks],
    ['Completed Tasks', data.stats.completedTasks],
    ['Pending Tasks', data.stats.totalTasks - data.stats.completedTasks],
    ['Overdue Tasks', data.stats.overdueTasks],
    ['Completion Rate', `${data.stats.overallProgress}%`],
    [''],
    ['TASK BREAKDOWN BY STATUS'],
    ['Status', 'Count'],
    ['Pending', data.tasks.filter(t => t.status === 'pending').length],
    ['In Progress', data.tasks.filter(t => t.status === 'in_progress').length],
    ['Completed', data.tasks.filter(t => t.status === 'completed').length],
    ['Cancelled', data.tasks.filter(t => t.status === 'cancelled').length],
    [''],
    ['TASK BREAKDOWN BY PRIORITY'],
    ['Priority', 'Count'],
    ['Low', data.tasks.filter(t => t.priority === 'low').length],
    ['Medium', data.tasks.filter(t => t.priority === 'medium').length],
    ['High', data.tasks.filter(t => t.priority === 'high').length],
    ['Urgent', data.tasks.filter(t => t.priority === 'urgent').length],
  ]

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary')

  // Generate Excel file
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

export function downloadFile(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}
