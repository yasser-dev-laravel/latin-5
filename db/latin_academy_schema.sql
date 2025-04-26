-- قاعدة بيانات Latin Academy
-- SQL DDL for MySQL/PostgreSQL compatible

CREATE TABLE branches (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    address VARCHAR(200),
    phone VARCHAR(30)
);

CREATE TABLE labs (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    branch_id VARCHAR(64) NOT NULL,
    FOREIGN KEY (branch_id) REFERENCES branches(id)
);

CREATE TABLE students (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(30),
    parent_phone VARCHAR(30),
    notes TEXT
);

CREATE TABLE courses (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT
);

CREATE TABLE course_levels (
    id VARCHAR(64) PRIMARY KEY,
    course_id VARCHAR(64) NOT NULL,
    level_number INT NOT NULL,
    lecture_count INT NOT NULL,
    price DECIMAL(10,2),
    FOREIGN KEY (course_id) REFERENCES courses(id)
);

CREATE TABLE instructors (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(30)
);

CREATE TABLE groups (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    branch_id VARCHAR(64) NOT NULL,
    lab_id VARCHAR(64) NOT NULL,
    course_id VARCHAR(64) NOT NULL,
    level_id VARCHAR(64) NOT NULL,
    instructor_id VARCHAR(64) NOT NULL,
    start_date DATE NOT NULL,
    start_time TIME NOT NULL,
    duration DECIMAL(3,1) NOT NULL,
    weekly_days VARCHAR(50) NOT NULL, -- Comma separated days (e.g. 'الأحد,الثلاثاء')
    status VARCHAR(20) NOT NULL,
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (lab_id) REFERENCES labs(id),
    FOREIGN KEY (course_id) REFERENCES courses(id),
    FOREIGN KEY (level_id) REFERENCES course_levels(id),
    FOREIGN KEY (instructor_id) REFERENCES instructors(id)
);

CREATE TABLE group_members (
    id SERIAL PRIMARY KEY,
    group_id VARCHAR(64) NOT NULL,
    student_id VARCHAR(64) NOT NULL,
    status VARCHAR(20) NOT NULL, -- active, finished, transferred, ...
    FOREIGN KEY (group_id) REFERENCES groups(id),
    FOREIGN KEY (student_id) REFERENCES students(id)
);

CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    group_id VARCHAR(64) NOT NULL,
    session_number INT NOT NULL,
    date DATE NOT NULL,
    slot TIME NOT NULL,
    image_url VARCHAR(200),
    notes TEXT,
    FOREIGN KEY (group_id) REFERENCES groups(id)
);

CREATE TABLE attendance (
    id SERIAL PRIMARY KEY,
    session_id INT NOT NULL,
    student_id VARCHAR(64) NOT NULL,
    present BOOLEAN NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id),
    FOREIGN KEY (student_id) REFERENCES students(id)
);

CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(64) NOT NULL,
    group_id VARCHAR(64) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_date DATE NOT NULL,
    method VARCHAR(30),
    notes TEXT,
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (group_id) REFERENCES groups(id)
);

CREATE TABLE campaigns (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    start_date DATE,
    end_date DATE,
    notes TEXT
);

CREATE TABLE leads (
    id SERIAL PRIMARY KEY,
    campaign_id VARCHAR(64) NOT NULL,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(30),
    status VARCHAR(20),
    notes TEXT,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
);
