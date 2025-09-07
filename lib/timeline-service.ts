import { getSupabaseClient } from './supabase';

export interface TimelineItem {
  id: string;
  booking_id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'on_hold';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  start_date: string;
  end_date: string;
  assigned_to?: string;
  progress_percentage: number;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export class TimelineService {
  static async getTimeline(bookingId: string): Promise<TimelineItem[]> {
    try {
      const supabase = await getSupabaseClient();
      
      const { data, error } = await supabase
        .from('project_timeline')
        .select('*')
        .eq('booking_id', bookingId)
        .order('order_index');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching timeline:', error);
      throw error;
    }
  }

  static async createTimelineItem(
    bookingId: string,
    item: Omit<TimelineItem, 'id' | 'booking_id' | 'created_at' | 'updated_at'>
  ): Promise<TimelineItem> {
    try {
      const supabase = await getSupabaseClient();
      
      const { data, error } = await supabase
        .from('project_timeline')
        .insert({
          booking_id: bookingId,
          ...item,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating timeline item:', error);
      throw error;
    }
  }

  static async updateTimelineItem(
    itemId: string,
    updates: Partial<TimelineItem>
  ): Promise<TimelineItem> {
    try {
      const supabase = await getSupabaseClient();
      
      const { data, error } = await supabase
        .from('project_timeline')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating timeline item:', error);
      throw error;
    }
  }

  static async deleteTimelineItem(itemId: string): Promise<void> {
    try {
      const supabase = await getSupabaseClient();
      
      const { error } = await supabase
        .from('project_timeline')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting timeline item:', error);
      throw error;
    }
  }

  static async reorderTimelineItems(
    bookingId: string,
    items: { id: string; order_index: number }[]
  ): Promise<void> {
    try {
      const supabase = await getSupabaseClient();
      
      // Update all items in a single transaction
      const updates = items.map(item => 
        supabase
          .from('project_timeline')
          .update({ 
            order_index: item.order_index,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.id)
      );

      const results = await Promise.all(updates);
      
      // Check for errors
      for (const result of results) {
        if (result.error) throw result.error;
      }
    } catch (error) {
      console.error('Error reordering timeline items:', error);
      throw error;
    }
  }

  static async saveTimeline(
    bookingId: string,
    timeline: TimelineItem[]
  ): Promise<void> {
    try {
      const supabase = await getSupabaseClient();
      
      // Get current timeline from database
      const { data: currentTimeline } = await supabase
        .from('project_timeline')
        .select('*')
        .eq('booking_id', bookingId);

      if (!currentTimeline) return;

      // Find items to delete (in current but not in new)
      const currentIds = currentTimeline.map(item => item.id);
      const newIds = timeline.map(item => item.id);
      const itemsToDelete = currentIds.filter(id => !newIds.includes(id));

      // Find items to update (in both current and new)
      const itemsToUpdate = timeline.filter(item => 
        currentIds.includes(item.id) && 
        item.id.startsWith('temp_') === false
      );

      // Find items to create (new items with temp IDs)
      const itemsToCreate = timeline.filter(item => item.id.startsWith('temp_'));

      // Delete removed items
      if (itemsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('project_timeline')
          .delete()
          .in('id', itemsToDelete);

        if (deleteError) throw deleteError;
      }

      // Update existing items
      for (const item of itemsToUpdate) {
        const { error: updateError } = await supabase
          .from('project_timeline')
          .update({
            title: item.title,
            description: item.description,
            status: item.status,
            priority: item.priority,
            start_date: item.start_date,
            end_date: item.end_date,
            assigned_to: item.assigned_to,
            progress_percentage: item.progress_percentage,
            order_index: item.order_index,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.id);

        if (updateError) throw updateError;
      }

      // Create new items
      if (itemsToCreate.length > 0) {
        const newItems = itemsToCreate.map(item => ({
          booking_id: bookingId,
          title: item.title,
          description: item.description,
          status: item.status,
          priority: item.priority,
          start_date: item.start_date,
          end_date: item.end_date,
          assigned_to: item.assigned_to,
          progress_percentage: item.progress_percentage,
          order_index: item.order_index,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));

        const { error: createError } = await supabase
          .from('project_timeline')
          .insert(newItems);

        if (createError) throw createError;
      }
    } catch (error) {
      console.error('Error saving timeline:', error);
      throw error;
    }
  }
}
