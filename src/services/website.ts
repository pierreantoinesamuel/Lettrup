import { supabase } from '../lib/supabase';

export interface WebsiteConfig {
  id: string;
  config_name: string;
  template: string;
  sections: string[];
  resume_data: any;
  is_published?: boolean;
  published_url?: string;
  updated_at: string;
  view_count?: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): WebsiteConfig {
  return {
    id: row.id,
    config_name: row.config_name,
    template: row.template,
    sections: row.sections || [],
    resume_data: row.resume_data || {},
    is_published: row.is_published || false,
    published_url: row.published_url || '',
    updated_at: row.updated_at,
    view_count: row.view_count || 0,
  };
}

export const getUserWebsiteConfigs = async (userId: string): Promise<WebsiteConfig[]> => {
  if (!supabase || !userId) return [];
  const { data, error } = await supabase
    .from('website_configs')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error || !data) return [];
  return data.map(mapRow);
};

export const saveWebsiteConfig = async (userId: string, data: any): Promise<WebsiteConfig> => {
  if (!supabase) throw new Error('Supabase non configuré.');

  const { data: row, error } = await supabase
    .from('website_configs')
    .insert({
      user_id: userId,
      config_name: data.config_name || 'My Portfolio',
      template: data.template || 'modern',
      sections: data.sections || ['about', 'experience', 'skills', 'projects'],
      resume_data: data.resume_data || {},
      is_published: data.is_published || false,
      published_url: data.published_url || null,
      theme_config: data.theme_config,
    })
    .select()
    .single();

  if (error || !row) throw new Error(error?.message || 'Failed to save website config.');
  return mapRow(row);
};

export const updateWebsiteConfig = async (configId: string, userId: string, data: any): Promise<WebsiteConfig | null> => {
  if (!supabase) return null;

  const allowed: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of ['config_name', 'template', 'sections', 'resume_data', 'is_published', 'published_url', 'theme_config'] as const) {
    if (data[key] !== undefined) allowed[key] = data[key];
  }

  const { data: row, error } = await supabase
    .from('website_configs')
    .update(allowed)
    .eq('id', configId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error || !row) return null;
  return mapRow(row);
};

export const deleteWebsiteConfig = async (configId: string, userId: string): Promise<boolean> => {
  if (!supabase) return false;
  const { error } = await supabase
    .from('website_configs')
    .delete()
    .eq('id', configId)
    .eq('user_id', userId);
  return !error;
};
