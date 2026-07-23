// Supabase connection for the guestbook.
//
// The anon key is MEANT to be public — it identifies the project, it is not a
// password. Everything that keeps the data safe lives in the Row Level
// Security policies on the database side (see README). Publishing this key
// with the wrong policies would hand the world write access to your tables,
// so set the policies up before filling these in.
//
// Leave the values empty and the guestbook renders a "not set up yet" notice
// instead of breaking the page.
export const SUPABASE = {
  url: 'https://ilyskeyjubwxznnwqroq.supabase.co',     
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlseXNrZXlqdWJ3eHpubndxcm9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3MDk2NjEsImV4cCI6MjEwMDI4NTY2MX0.Z_b9ESkannz0DNvgBMun73Gp6FfpSw4Pzeg_QwqbDN0', 
  // Key này là public, không phải password. Nó chỉ xác định project Supabase, không cho phép truy cập trái phép vào dữ liệu. Mọi bảo mật đều được quản lý bởi các chính sách Row Level Security trên cơ sở dữ liệu.

  // Guests write here; the name column is never exposed for reading.
  table: 'guestbook',
  // A view over that table exposing only the message, safe to read publicly.
  publicView: 'guestbook_public',
};

export const isConfigured = () => Boolean(SUPABASE.url && SUPABASE.anonKey);
