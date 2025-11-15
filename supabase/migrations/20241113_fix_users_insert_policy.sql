-- Fix: Allow user creation during OAuth sign-in
-- Users need to be able to insert themselves during the sign-in flow

CREATE POLICY "Anyone can create a user account"
  ON users FOR INSERT
  WITH CHECK (true);
