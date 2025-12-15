-- Add access_granted column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS access_granted BOOLEAN DEFAULT false;

-- Update ALL existing users to have access granted (so they don't get locked out)
UPDATE users
SET access_granted = true;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_access_granted ON users(access_granted);

-- Add comment for documentation
COMMENT ON COLUMN users.access_granted IS 'Whether the user has been granted access by an admin. New users are blocked until approved.';

-- Create function to automatically grant access to admin users
CREATE OR REPLACE FUNCTION grant_access_to_admins()
RETURNS TRIGGER AS $$
BEGIN
  -- Automatically grant access to admin users
  IF NEW.role = 'admin' THEN
    NEW.access_granted := true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new users
DROP TRIGGER IF EXISTS auto_grant_admin_access ON users;
CREATE TRIGGER auto_grant_admin_access
  BEFORE INSERT OR UPDATE OF role ON users
  FOR EACH ROW
  EXECUTE FUNCTION grant_access_to_admins();

-- Also create trigger to ensure admins always have access
-- (in case someone tries to revoke access from an admin)
CREATE OR REPLACE FUNCTION ensure_admin_has_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent revoking access from admins
  IF NEW.role = 'admin' AND NEW.access_granted = false THEN
    NEW.access_granted := true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS protect_admin_access ON users;
CREATE TRIGGER protect_admin_access
  BEFORE UPDATE OF access_granted ON users
  FOR EACH ROW
  EXECUTE FUNCTION ensure_admin_has_access();

