import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import * as ExcelJS from 'exceljs'

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
  return new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' })
}

export async function generateExcel(data: ExportData): Promise<Blob> {
  // Create workbook
  const workbook = new ExcelJS.Workbook()

  // Project Overview Sheet
  const overviewSheet = workbook.addWorksheet('Overview')
  
  overviewSheet.addRow(['Project Progress Report'])
  overviewSheet.addRow([''])
  overviewSheet.addRow(['Booking ID', data.booking.id])
  overviewSheet.addRow(['Title', data.booking.title])
  overviewSheet.addRow(['Status', data.booking.status.toUpperCase()])
  overviewSheet.addRow(['Amount', `${data.booking.currency} ${data.booking.amount}`])
  overviewSheet.addRow(['Created', new Date(data.booking.created_at).toLocaleDateString()])
  overviewSheet.addRow(['Generated', new Date().toLocaleDateString()])
  overviewSheet.addRow([''])
  overviewSheet.addRow(['Client Information'])
  overviewSheet.addRow(['Name', data.booking.client.full_name])
  overviewSheet.addRow(['Email', data.booking.client.email])
  overviewSheet.addRow(['Company', data.booking.client.company_name || 'N/A'])
  overviewSheet.addRow([''])
  overviewSheet.addRow(['Provider Information'])
  overviewSheet.addRow(['Name', data.booking.provider.full_name])
  overviewSheet.addRow(['Email', data.booking.provider.email])
  overviewSheet.addRow(['Company', data.booking.provider.company_name || 'N/A'])
  overviewSheet.addRow([''])
  overviewSheet.addRow(['Progress Statistics'])
  overviewSheet.addRow(['Total Tasks', data.stats.totalTasks])
  overviewSheet.addRow(['Completed Tasks', data.stats.completedTasks])
  overviewSheet.addRow(['Overdue Tasks', data.stats.overdueTasks])
  overviewSheet.addRow(['Overall Progress', `${data.stats.overallProgress}%`])

  // Tasks Sheet
  if (data.tasks.length > 0) {
    const tasksSheet = workbook.addWorksheet('Tasks')
    
    tasksSheet.addRow(['Task ID', 'Title', 'Description', 'Status', 'Priority', 'Due Date', 'Completed At', 'Overdue', 'Weight'])
    
    data.tasks.forEach(task => {
      tasksSheet.addRow([
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
    })
  }

  // Milestones Sheet
  if (data.milestones.length > 0) {
    const milestonesSheet = workbook.addWorksheet('Milestones')
    
    milestonesSheet.addRow(['Milestone ID', 'Title', 'Description', 'Status', 'Due Date', 'Created At'])
    
    data.milestones.forEach(milestone => {
      milestonesSheet.addRow([
        milestone.id,
        milestone.title,
        milestone.description || '',
        milestone.status.toUpperCase(),
        milestone.due_date ? new Date(milestone.due_date).toLocaleDateString() : '',
        new Date(milestone.created_at).toLocaleDateString()
      ])
    })
  }

  // Summary Sheet
  const summarySheet = workbook.addWorksheet('Summary')
  
  summarySheet.addRow(['PROJECT SUMMARY'])
  summarySheet.addRow([''])
  summarySheet.addRow(['Metric', 'Value'])
  summarySheet.addRow(['Total Tasks', data.stats.totalTasks])
  summarySheet.addRow(['Completed Tasks', data.stats.completedTasks])
  summarySheet.addRow(['Pending Tasks', data.stats.totalTasks - data.stats.completedTasks])
  summarySheet.addRow(['Overdue Tasks', data.stats.overdueTasks])
  summarySheet.addRow(['Completion Rate', `${data.stats.overallProgress}%`])
  summarySheet.addRow([''])
  summarySheet.addRow(['TASK BREAKDOWN BY STATUS'])
  summarySheet.addRow(['Status', 'Count'])
  summarySheet.addRow(['Pending', data.tasks.filter(t => t.status === 'pending').length])
  summarySheet.addRow(['In Progress', data.tasks.filter(t => t.status === 'in_progress').length])
  summarySheet.addRow(['Completed', data.tasks.filter(t => t.status === 'completed').length])
  summarySheet.addRow(['Cancelled', data.tasks.filter(t => t.status === 'cancelled').length])
  summarySheet.addRow([''])
  summarySheet.addRow(['TASK BREAKDOWN BY PRIORITY'])
  summarySheet.addRow(['Priority', 'Count'])
  summarySheet.addRow(['Low', data.tasks.filter(t => t.priority === 'low').length])
  summarySheet.addRow(['Normal', data.tasks.filter(t => t.priority === 'normal').length])
  summarySheet.addRow(['High', data.tasks.filter(t => t.priority === 'high').length])
  summarySheet.addRow(['Urgent', data.tasks.filter(t => t.priority === 'urgent').length])

  // Generate Excel file
  const buffer = await workbook.xlsx.writeBuffer()
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
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
