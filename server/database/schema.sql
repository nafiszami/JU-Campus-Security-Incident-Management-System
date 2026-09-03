CREATE DATABASE IF NOT EXISTS ju_csims;
USE ju_csims;

-- Users Table
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('Admin', 'Security Officer', 'Gate Operator', 'Guard', 'Student', 'Proctor') NOT NULL,
  is_head_security_officer BOOLEAN DEFAULT FALSE,
  phone VARCHAR(20),
  assigned_gate VARCHAR(100) NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_role (role),
  INDEX idx_active (is_active)
);

-- Incidents Table
CREATE TABLE incidents (
  id INT PRIMARY KEY AUTO_INCREMENT,
  report_id VARCHAR(20) UNIQUE NOT NULL,
  reported_by INT NOT NULL,
  report_type ENUM('Theft', 'Harassment', 'Suspicious Activity', 'Vandalism', 'Accident', 'Gate Violation', 'Unauthorized Entry', 'Investigation Report') NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  location VARCHAR(255) NOT NULL,
  priority ENUM('High', 'Medium', 'Low') NOT NULL,
  status ENUM('Submitted', 'Assigned', 'Under Investigation', 'Resolved', 'Closed', 'Revision Required', 'Deleted') DEFAULT 'Submitted',
  evidence_path VARCHAR(500),
  assigned_to INT NULL,
  assigned_at DATETIME NULL,
  investigation_notes TEXT,
  resolved_at DATETIME NULL,
  closed_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_reported_by (reported_by),
  INDEX idx_status (status),
  INDEX idx_priority (priority),
  INDEX idx_report_id (report_id),
  FOREIGN KEY (reported_by) REFERENCES users(id),
  FOREIGN KEY (assigned_to) REFERENCES users(id)
);

-- Assignment History Table
CREATE TABLE assignment_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  incident_id INT NOT NULL,
  assigned_from INT NULL,
  assigned_to INT NOT NULL,
  assigned_by INT NOT NULL,
  reason VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (incident_id) REFERENCES incidents(id),
  FOREIGN KEY (assigned_from) REFERENCES users(id),
  FOREIGN KEY (assigned_to) REFERENCES users(id),
  FOREIGN KEY (assigned_by) REFERENCES users(id)
);

-- Visitors Table
CREATE TABLE visitors (
  id INT PRIMARY KEY AUTO_INCREMENT,
  visitor_id VARCHAR(20) UNIQUE NOT NULL,
  category ENUM('Guardian/Parent', 'Guest Visitor', 'Alumni', 'Event Participant', 'Delivery Personnel', 'Construction Worker', 'Contractor', 'Local Resident', 'Vendor/Shop Owner') NOT NULL,
  name VARCHAR(255) NOT NULL,
  identity_number VARCHAR(50) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  purpose VARCHAR(255),
  host_name VARCHAR(255),
  host_department VARCHAR(255),
  student_name VARCHAR(255),
  student_hall VARCHAR(255),
  company_name VARCHAR(255),
  project_code VARCHAR(100),
  work_site VARCHAR(255),
  vehicle_plate VARCHAR(20),
  event_name VARCHAR(255),
  event_pass VARCHAR(100),
  registered_by INT NOT NULL,
  status ENUM('Registered', 'Inside', 'Exited') DEFAULT 'Registered',
  entry_time DATETIME NULL,
  exit_time DATETIME NULL,
  entry_gate VARCHAR(100) NULL,
  exit_gate VARCHAR(100) NULL,
  entered_by INT NULL,
  exited_by INT NULL,
  duration_minutes INT NULL,
  pass_valid_until DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_identity (identity_number),
  INDEX idx_phone (phone),
  INDEX idx_visitor_id (visitor_id),
  INDEX idx_status (status),
  FOREIGN KEY (registered_by) REFERENCES users(id),
  FOREIGN KEY (entered_by) REFERENCES users(id),
  FOREIGN KEY (exited_by) REFERENCES users(id)
);

-- Restricted Visitors Table
CREATE TABLE restricted_visitors (
  id INT PRIMARY KEY AUTO_INCREMENT,
  identity_number VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  reason TEXT NOT NULL,
  restriction_type ENUM('Temporary', 'Permanent') NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NULL,
  is_active BOOLEAN DEFAULT TRUE,
  added_by INT NOT NULL,
  remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_identity (identity_number),
  INDEX idx_active (is_active),
  FOREIGN KEY (added_by) REFERENCES users(id)
);

-- Restriction Exceptions Table
CREATE TABLE restriction_exceptions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  restricted_visitor_id INT NOT NULL,
  requested_by INT NOT NULL,
  request_date_time DATETIME NOT NULL,
  purpose TEXT NOT NULL,
  host_authority VARCHAR(255) NOT NULL,
  status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
  approved_by INT NULL,
  approved_at DATETIME NULL,
  rejection_reason TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_restricted (restricted_visitor_id),
  INDEX idx_status (status),
  FOREIGN KEY (restricted_visitor_id) REFERENCES restricted_visitors(id),
  FOREIGN KEY (requested_by) REFERENCES users(id),
  FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- Checkpoints Table
CREATE TABLE checkpoints (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_active (is_active)
);

-- Guard Schedules Table
CREATE TABLE guard_schedules (
  id INT PRIMARY KEY AUTO_INCREMENT,
  guard_id INT NOT NULL,
  checkpoint_id INT NOT NULL,
  date DATE NOT NULL,
  shift ENUM('Morning', 'Day', 'Night') NOT NULL,
  shift_start TIME NOT NULL,
  shift_end TIME NOT NULL,
  assigned_by INT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_guard (guard_id),
  INDEX idx_date (date),
  INDEX idx_checkpoint (checkpoint_id),
  UNIQUE KEY unique_assignment (guard_id, date, shift),
  FOREIGN KEY (guard_id) REFERENCES users(id),
  FOREIGN KEY (checkpoint_id) REFERENCES checkpoints(id),
  FOREIGN KEY (assigned_by) REFERENCES users(id)
);

-- Guard Availability Table
CREATE TABLE guard_availability (
  id INT PRIMARY KEY AUTO_INCREMENT,
  guard_id INT NOT NULL,
  date DATE NOT NULL,
  is_available BOOLEAN DEFAULT TRUE,
  reason VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_guard (guard_id),
  INDEX idx_date (date),
  FOREIGN KEY (guard_id) REFERENCES users(id)
);

-- Audit Logs Table
CREATE TABLE audit_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  action VARCHAR(255) NOT NULL,
  description TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  INDEX idx_action (action),
  INDEX idx_created (created_at),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Checkpoint Seed Data
INSERT INTO checkpoints (name, location, description) VALUES
('Main Gate', 'University Main Entrance', 'Primary entry point for vehicles and pedestrians'),
('Science Faculty Gate', 'Science Faculty Area', 'Gate near science faculty buildings'),
('Arts Faculty Gate', 'Arts Faculty Area', 'Gate near arts faculty buildings'),
('Admin Building', 'Administrative Building', 'Security post at admin building'),
('Library', 'Central Library', 'Security post at library entrance');

-- Test Users (Password: Password123)
INSERT INTO users (name, email, password_hash, role, is_head_security_officer, phone) VALUES 
('Admin User', 'admin@juniv.edu', '$2a$10$4teIgk/NT4NHVUT66L0OF.pyx8ZMirjhh4Wi8tXGDJzh2BK0gkrLS', 'Admin', FALSE, '01700000000'), 
('Security Officer', 'officer@juniv.edu', '$2a$10$4teIgk/NT4NHVUT66L0OF.pyx8ZMirjhh4Wi8tXGDJzh2BK0gkrLS', 'Security Officer', FALSE, '01700000001'), 
('Gate Operator', 'gate@juniv.edu', '$2a$10$4teIgk/NT4NHVUT66L0OF.pyx8ZMirjhh4Wi8tXGDJzh2BK0gkrLS', 'Gate Operator', FALSE, '01700000002'), 
('Guard 1', 'guard1@juniv.edu', '$2a$10$4teIgk/NT4NHVUT66L0OF.pyx8ZMirjhh4Wi8tXGDJzh2BK0gkrLS', 'Guard', FALSE, '01700000003'), 
('Guard 2', 'guard2@juniv.edu', '$2a$10$4teIgk/NT4NHVUT66L0OF.pyx8ZMirjhh4Wi8tXGDJzh2BK0gkrLS', 'Guard', FALSE, '01700000004'), 
('Student', 'student@juniv.edu', '$2a$10$4teIgk/NT4NHVUT66L0OF.pyx8ZMirjhh4Wi8tXGDJzh2BK0gkrLS', 'Student', FALSE, '01700000005'),
('Security Officer 2', 'officer2@juniv.edu', '$2a$10$4teIgk/NT4NHVUT66L0OF.pyx8ZMirjhh4Wi8tXGDJzh2BK0gkrLS', 'Security Officer', TRUE, '01700000006'),
('Security Officer 3', 'officer3@juniv.edu', '$2a$10$4teIgk/NT4NHVUT66L0OF.pyx8ZMirjhh4Wi8tXGDJzh2BK0gkrLS', 'Security Officer', FALSE, '01700000007');