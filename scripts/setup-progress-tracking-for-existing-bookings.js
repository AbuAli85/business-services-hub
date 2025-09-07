const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Sample milestone templates for different service types
const milestoneTemplates = {
  'seo': [
    { title: 'Initial Analysis & Research', description: 'Conduct comprehensive SEO audit and keyword research', weight: 1.0, estimated_hours: 8 },
    { title: 'On-Page Optimization', description: 'Optimize website structure, content, and meta tags', weight: 1.5, estimated_hours: 12 },
    { title: 'Technical SEO Implementation', description: 'Fix technical issues and improve site performance', weight: 1.2, estimated_hours: 10 },
    { title: 'Content Strategy & Creation', description: 'Develop content calendar and create optimized content', weight: 1.3, estimated_hours: 15 },
    { title: 'Link Building & Outreach', description: 'Build quality backlinks and establish authority', weight: 1.0, estimated_hours: 8 },
    { title: 'Monitoring & Reporting', description: 'Track progress and provide detailed reports', weight: 0.8, estimated_hours: 6 }
  ],
  'digital_marketing': [
    { title: 'Strategy Development', description: 'Create comprehensive digital marketing strategy', weight: 1.0, estimated_hours: 10 },
    { title: 'Campaign Setup', description: 'Set up advertising campaigns across platforms', weight: 1.2, estimated_hours: 12 },
    { title: 'Content Creation', description: 'Create engaging content for all channels', weight: 1.5, estimated_hours: 20 },
    { title: 'Social Media Management', description: 'Manage social media presence and engagement', weight: 1.0, estimated_hours: 8 },
    { title: 'Performance Optimization', description: 'Optimize campaigns based on performance data', weight: 1.0, estimated_hours: 8 },
    { title: 'Analytics & Reporting', description: 'Analyze results and provide insights', weight: 0.8, estimated_hours: 6 }
  ],
  'translation': [
    { title: 'Document Analysis', description: 'Review and analyze source documents', weight: 1.0, estimated_hours: 4 },
    { title: 'Translation Phase 1', description: 'Initial translation of core content', weight: 1.5, estimated_hours: 12 },
    { title: 'Quality Review', description: 'Review and edit translated content', weight: 1.0, estimated_hours: 6 },
    { title: 'Translation Phase 2', description: 'Complete remaining translations', weight: 1.2, estimated_hours: 8 },
    { title: 'Final Proofreading', description: 'Final proofreading and quality assurance', weight: 0.8, estimated_hours: 4 },
    { title: 'Delivery & Feedback', description: 'Deliver final documents and gather feedback', weight: 0.5, estimated_hours: 2 }
  ],
  'pro_services': [
    { title: 'Requirements Gathering', description: 'Collect and analyze client requirements', weight: 1.0, estimated_hours: 6 },
    { title: 'Project Planning', description: 'Create detailed project plan and timeline', weight: 0.8, estimated_hours: 4 },
    { title: 'Development Phase 1', description: 'Core development and implementation', weight: 1.5, estimated_hours: 20 },
    { title: 'Testing & Quality Assurance', description: 'Comprehensive testing and bug fixes', weight: 1.0, estimated_hours: 8 },
    { title: 'Development Phase 2', description: 'Additional features and refinements', weight: 1.2, estimated_hours: 12 },
    { title: 'Deployment & Handover', description: 'Deploy solution and provide documentation', weight: 0.8, estimated_hours: 6 }
  ]
};

// Sample tasks for each milestone
const taskTemplates = {
  'seo': [
    ['Conduct website audit', 'Analyze current SEO performance', 'Identify technical issues'],
    ['Keyword research', 'Competitor analysis', 'Meta tag optimization', 'Content optimization'],
    ['Fix crawl errors', 'Improve site speed', 'Mobile optimization', 'Schema markup'],
    ['Content calendar creation', 'Blog post writing', 'Page content updates'],
    ['Link prospecting', 'Outreach campaigns', 'Guest posting'],
    ['Performance tracking', 'Monthly reports', 'Client communication']
  ],
  'digital_marketing': [
    ['Market research', 'Target audience analysis', 'Competitor analysis'],
    ['Ad account setup', 'Campaign configuration', 'Budget allocation'],
    ['Video production', 'Graphic design', 'Copywriting', 'Content scheduling'],
    ['Platform management', 'Community engagement', 'Influencer outreach'],
    ['A/B testing', 'Performance analysis', 'Budget optimization'],
    ['ROI analysis', 'Client reporting', 'Recommendations']
  ],
  'translation': [
    ['Document review', 'Terminology research', 'Style guide creation'],
    ['Core content translation', 'Technical translation', 'Cultural adaptation'],
    ['Quality check', 'Consistency review', 'Accuracy verification'],
    ['Remaining content translation', 'Formatting', 'Layout adjustment'],
    ['Final proofreading', 'Grammar check', 'Style consistency'],
    ['Document formatting', 'Client delivery', 'Feedback collection']
  ],
  'pro_services': [
    ['Client interviews', 'Requirements documentation', 'Scope definition'],
    ['Project timeline creation', 'Resource allocation', 'Risk assessment'],
    ['Core functionality development', 'Database design', 'API integration'],
    ['Unit testing', 'Integration testing', 'Bug fixing'],
    ['Feature enhancements', 'Performance optimization', 'Security implementation'],
    ['Documentation creation', 'User training', 'Deployment']
  ]
};

async function setupProgressTrackingForBookings() {
  try {
    console.log('🚀 Setting up progress tracking for existing bookings...\n');

    // Get all bookings
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });

    if (bookingsError) {
      throw new Error(`Failed to fetch bookings: ${bookingsError.message}`);
    }

    console.log(`📊 Found ${bookings.length} bookings to process\n`);

    // Get services to determine service type
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('id, title, category');

    if (servicesError) {
      throw new Error(`Failed to fetch services: ${servicesError.message}`);
    }

    const serviceMap = {};
    services.forEach(service => {
      serviceMap[service.id] = service;
    });

    let processedCount = 0;
    let milestoneCount = 0;
    let taskCount = 0;

    for (const booking of bookings) {
      console.log(`\n📋 Processing booking: ${booking.title} (${booking.status})`);
      
      // Determine service type
      const service = serviceMap[booking.service_id];
      let serviceType = 'pro_services'; // default
      
      if (service) {
        const title = service.title.toLowerCase();
        if (title.includes('seo')) serviceType = 'seo';
        else if (title.includes('digital') || title.includes('marketing')) serviceType = 'digital_marketing';
        else if (title.includes('translation')) serviceType = 'translation';
      }

      console.log(`   Service type: ${serviceType}`);

      // Check if milestones already exist for this booking
      const { data: existingMilestones } = await supabase
        .from('milestones')
        .select('id')
        .eq('booking_id', booking.id);

      if (existingMilestones && existingMilestones.length > 0) {
        console.log(`   ⏭️  Milestones already exist, skipping...`);
        continue;
      }

      // Create milestones
      const milestones = milestoneTemplates[serviceType] || milestoneTemplates['pro_services'];
      const milestoneData = milestones.map((milestone, index) => ({
        booking_id: booking.id,
        title: milestone.title,
        description: milestone.description,
        weight: milestone.weight,
        estimated_hours: milestone.estimated_hours,
        order_index: index,
        status: index === 0 ? 'in_progress' : 'pending',
        due_date: new Date(Date.now() + (index + 1) * 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week intervals
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const { data: createdMilestones, error: milestoneError } = await supabase
        .from('milestones')
        .insert(milestoneData)
        .select();

      if (milestoneError) {
        console.log(`   ❌ Failed to create milestones: ${milestoneError.message}`);
        continue;
      }

      console.log(`   ✅ Created ${createdMilestones.length} milestones`);

      // Create tasks for each milestone
      const tasks = taskTemplates[serviceType] || taskTemplates['pro_services'];
      
      for (let i = 0; i < createdMilestones.length; i++) {
        const milestone = createdMilestones[i];
        const milestoneTasks = tasks[i] || [];
        
        const taskData = milestoneTasks.map((taskTitle, taskIndex) => ({
          milestone_id: milestone.id,
          title: taskTitle,
          description: `Complete ${taskTitle.toLowerCase()}`,
          status: taskIndex === 0 ? 'in_progress' : 'pending',
          order_index: taskIndex,
          estimated_hours: Math.max(1, Math.floor(milestone.estimated_hours / milestoneTasks.length)),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));

        if (taskData.length > 0) {
          const { error: taskError } = await supabase
            .from('tasks')
            .insert(taskData);

          if (taskError) {
            console.log(`   ⚠️  Failed to create tasks for milestone ${i + 1}: ${taskError.message}`);
          } else {
            console.log(`   ✅ Created ${taskData.length} tasks for milestone: ${milestone.title}`);
            taskCount += taskData.length;
          }
        }
      }

      milestoneCount += createdMilestones.length;
      processedCount++;

      // Update booking progress
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ 
          project_progress: 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', booking.id);

      if (updateError) {
        console.log(`   ⚠️  Failed to update booking progress: ${updateError.message}`);
      }
    }

    console.log('\n🎉 Progress tracking setup completed!');
    console.log(`📊 Summary:`);
    console.log(`   - Processed bookings: ${processedCount}`);
    console.log(`   - Created milestones: ${milestoneCount}`);
    console.log(`   - Created tasks: ${taskCount}`);
    console.log('\n✨ Your bookings now have full progress tracking capabilities!');

  } catch (error) {
    console.error('❌ Error setting up progress tracking:', error.message);
    process.exit(1);
  }
}

// Run the setup
setupProgressTrackingForBookings();
