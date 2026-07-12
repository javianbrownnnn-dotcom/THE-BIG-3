-- Channel standard is 18–20 minute videos. New content projects default to 18
-- (the old default was 15). Existing rows are untouched.
alter table content_projects alter column video_length_minutes set default 18;
