-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Households table (linked to Supabase Auth users)
CREATE TABLE households (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  household_number VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PDF Documents
CREATE TABLE pdf_documents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  published_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Circulation Board Items
CREATE TABLE circulation_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  content TEXT,
  file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Circulation Read Records (per household)
CREATE TABLE circulation_reads (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  circulation_item_id UUID REFERENCES circulation_items(id) ON DELETE CASCADE,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(circulation_item_id, household_id)
);

-- Events
CREATE TABLE events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  event_date TIMESTAMPTZ NOT NULL,
  location VARCHAR(200),
  max_attendees INTEGER,
  attachment_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event Registrations (per household)
CREATE TABLE event_registrations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  attendee_count INTEGER DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, household_id)
);

-- Surveys
CREATE TABLE surveys (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  attachment_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Survey Questions
CREATE TABLE survey_questions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type VARCHAR(20) NOT NULL CHECK (question_type IN ('single', 'multiple', 'text')),
  options JSONB,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Survey Responses
CREATE TABLE survey_responses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE,
  question_id UUID REFERENCES survey_questions(id) ON DELETE CASCADE,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  answer TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(question_id, household_id)
);

-- Feedback / Requests
CREATE TABLE feedbacks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  household_id UUID REFERENCES households(id) ON DELETE SET NULL,
  category VARCHAR(50) NOT NULL DEFAULT '意見',
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Schedule Events
CREATE TABLE schedule_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  event_date DATE NOT NULL,
  event_time TIME,
  location VARCHAR(200),
  content TEXT,
  category VARCHAR(50) NOT NULL DEFAULT 'その他',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE schedule_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read schedule_events" ON schedule_events FOR SELECT USING (true);
CREATE POLICY "Admins can insert schedule_events" ON schedule_events FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can update schedule_events" ON schedule_events FOR UPDATE USING (is_admin());
CREATE POLICY "Admins can delete schedule_events" ON schedule_events FOR DELETE USING (is_admin());

-- Notifications (Emergency + Regular)
CREATE TABLE notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  is_emergency BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Push Subscriptions
CREATE TABLE push_subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  subscription JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security Policies

ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE circulation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE circulation_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM households WHERE user_id = auth.uid() AND is_admin = TRUE
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper function to get household id for current user
CREATE OR REPLACE FUNCTION get_my_household_id()
RETURNS UUID AS $$
  SELECT id FROM households WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Households policies
CREATE POLICY "Users can read own household" ON households FOR SELECT USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "Admins can insert households" ON households FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can update households" ON households FOR UPDATE USING (is_admin());

-- PDF policies
CREATE POLICY "Anyone can read PDFs" ON pdf_documents FOR SELECT USING (true);
CREATE POLICY "Admins can manage PDFs" ON pdf_documents FOR ALL USING (is_admin());

-- Circulation policies
CREATE POLICY "All authenticated users can read circulation" ON circulation_items FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage circulation" ON circulation_items FOR ALL USING (is_admin());
CREATE POLICY "Users can read their reads" ON circulation_reads FOR SELECT USING (household_id = get_my_household_id() OR is_admin());
CREATE POLICY "Users can insert their reads" ON circulation_reads FOR INSERT WITH CHECK (household_id = get_my_household_id());

-- Events policies
CREATE POLICY "All authenticated users can read events" ON events FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage events" ON events FOR ALL USING (is_admin());
CREATE POLICY "Users can read registrations" ON event_registrations FOR SELECT USING (household_id = get_my_household_id() OR is_admin());
CREATE POLICY "Users can insert own registrations" ON event_registrations FOR INSERT WITH CHECK (household_id = get_my_household_id());
CREATE POLICY "Users can delete own registrations" ON event_registrations FOR DELETE USING (household_id = get_my_household_id());
CREATE POLICY "Users can update own registrations" ON event_registrations FOR UPDATE USING (household_id = get_my_household_id());

-- Survey policies
CREATE POLICY "All authenticated users can read surveys" ON surveys FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage surveys" ON surveys FOR ALL USING (is_admin());
CREATE POLICY "All authenticated users can read questions" ON survey_questions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage questions" ON survey_questions FOR ALL USING (is_admin());
CREATE POLICY "Users can read own responses" ON survey_responses FOR SELECT USING (household_id = get_my_household_id() OR is_admin());
CREATE POLICY "Users can insert own responses" ON survey_responses FOR INSERT WITH CHECK (household_id = get_my_household_id());

-- Feedback policies
CREATE POLICY "Users can insert feedbacks" ON feedbacks FOR INSERT WITH CHECK (household_id = get_my_household_id());
CREATE POLICY "Admins can read all feedbacks" ON feedbacks FOR SELECT USING (is_admin() OR household_id = get_my_household_id());
CREATE POLICY "Admins can update feedbacks" ON feedbacks FOR UPDATE USING (is_admin());

-- Notifications policies
CREATE POLICY "Anyone can read active notifications" ON notifications FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Admins can manage notifications" ON notifications FOR ALL USING (is_admin());

-- Push subscriptions policies
CREATE POLICY "Users can manage own subscriptions" ON push_subscriptions FOR ALL USING (user_id = auth.uid());

-- Storage bucket for PDFs (run in Supabase dashboard)
INSERT INTO storage.buckets (id, name, public) VALUES ('pdf-documents', 'pdf-documents', true)
  ON CONFLICT (id) DO UPDATE SET public = true;
CREATE POLICY "Public read access for PDFs" ON storage.objects FOR SELECT USING (bucket_id = 'pdf-documents');
CREATE POLICY "Admins can upload PDFs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'pdf-documents' AND is_admin());
CREATE POLICY "Admins can delete PDFs" ON storage.objects FOR DELETE USING (bucket_id = 'pdf-documents' AND is_admin());
