# API Endpoints - Entity-Specific Search Architecture

## Search-Based API Endpoints

All data retrieval now uses entity-specific search APIs with JWT token-based institute context. Each entity type has its own dedicated search endpoint. The backend extracts institute information from JWT tokens, eliminating the need to pass instituteId in requests.

### Entity-Specific Search APIs
```
POST /api/questions/search/advanced         - Search questions with filters
POST /api/courses/search/advanced           - Search courses  
POST /api/subjects/search/advanced          - Search subjects
POST /api/chapters/search/advanced          - Search chapters
POST /api/topics/search/advanced            - Search topics
POST /api/teachers/search/advanced          - Search teachers with filters
POST /api/students/search/advanced          - Search students with filters  
POST /api/institutes/search/advanced         - Search institutes with filters
```

**Payload Structure (No entityType needed - endpoint is entity-specific):**
```json
{
  "criteria": {
    // Filter criteria specific to entity type
    "courseId": 123,           // For subjects
    "subjectId": 456,          // For chapters  
    "chapterId": 789,          // For topics
    "difficultyLevel": "EASY", // For questions
    "role": "STUDENT",         // For users (STUDENT/TEACHER)
    "batchId": 456             // For students by batch
  },
  "pagination": {
    "page": 0,                 // 0-based page number
    "size": 20                 // Number of records per page
  },
  "sorting": {
    "field": "createdAt",      // Field to sort by
    "direction": "desc"        // asc or desc (lowercase)
  }
}
```

### CRUD Operations
```
POST /api/subjects                           - Create new subject
PUT /api/subjects/{subjectId}                - Update subject
DELETE /api/subjects/{subjectId}             - Delete subject

POST /api/chapters                           - Create new chapter
PUT /api/chapters/{chapterId}                - Update chapter  
DELETE /api/chapters/{chapterId}             - Delete chapter

POST /api/topics                             - Create new topic
PUT /api/topics/{topicId}                    - Update topic
DELETE /api/topics/{topicId}                 - Delete topic

POST /api/questions                         - Create new question
PUT /api/questions/{questionId}             - Update question
DELETE /api/questions/{questionId}          - Delete question
POST /api/questions/bulk-upload             - Bulk upload questions

POST /api/teachers                          - Create new teacher
PUT /api/teachers/{teacherId}               - Update teacher
DELETE /api/teachers/{teacherId}            - Delete teacher

POST /api/students                          - Create new student  
PUT /api/students/{studentId}               - Update student
DELETE /api/students/{studentId}            - Delete student
```

## Service Usage

### courseService.js (Primary Search Service)
- `searchEntityAdvanced(endpoint, criteria, pagination)` - Entity-specific search method with pagination support
- `getCourses(pagination)` - Get all courses with pagination (default: page=0, size=20) (uses POST /courses/search/advanced)
- `getSubjects(courseId, pagination)` - Get subjects, optionally filtered by course with pagination (default: page=0, size=20) (uses POST /subjects/search/advanced)
- `getChapters(subjectId, pagination)` - Get chapters, optionally filtered by subject with pagination (default: page=0, size=20) (uses POST /chapters/search/advanced)
- `getTopics(chapterId, pagination)` - Get topics, optionally filtered by chapter with pagination (default: page=0, size=20) (uses POST /topics/search/advanced)

### questionService.js (Delegates to courseService + Question Search)
- `searchQuestions(searchParams)` - Search questions with filters and pagination (default: page=0, size=20) (uses POST /questions/search/advanced)
- `getSubjects(pagination)` - Calls courseService.getSubjects() with pagination (default: page=0, size=100 for dropdowns) (uses POST /subjects/search/advanced)
- `getChaptersBySubject(subjectId, pagination)` - Calls courseService.getChapters(subjectId) with pagination (default: page=0, size=100 for dropdowns) (uses POST /chapters/search/advanced)
- `getTopicsByChapter(chapterId, pagination)` - Calls courseService.getTopics(chapterId) with pagination (default: page=0, size=100 for dropdowns) (uses POST /topics/search/advanced)
- `bulkUploadQuestions(file)` - Upload questions file (no instituteId needed)

### newUserService.js (User Management)
- `getStudentsByBatch(batchId, pagination)` - Search students, optionally filtered by batch with pagination (default: page=0, size=20) (uses POST /students/search/advanced)
- `getTeachers(pagination)` - Search teachers with pagination (default: page=0, size=20) (uses POST /teachers/search/advanced)
- `getUsers(filters)` - DEPRECATED: Delegates to getStudentsByBatch() or getTeachers() based on role filter
- `createUserProfile(userData)` - Create student or teacher based on role (uses POST /students or POST /teachers)
- `registerTeacher(teacherData)` - Create new teacher (uses POST /teachers)
- `registerStudent(studentData)` - Create new student (uses POST /students)

### newInstituteService.js (Institute Management)
- `getInstitutes(filters, pagination)` - Search institutes with optional name filter and pagination (default: page=0, size=20) (uses POST /institutes/search/advanced)
- `searchInstitutes(searchTerm, pagination)` - Search institutes by name with pagination (default: page=0, size=20) (uses POST /institutes/search/advanced)

### Usage in Components

#### Question Management Page
```javascript
// Search questions with filters and pagination
const { data, pagination } = await questionService.searchQuestions({
  page: 0,
  size: 20,
  difficulty: 'MEDIUM',
  subjectId: 123
});

// Load subjects for dropdown (default: page=0, size=100 for dropdown)
const { data: subjects } = await questionService.getSubjects();

// Load chapters when subject is selected (default: page=0, size=100 for dropdown)
const { data: chapters } = await questionService.getChaptersBySubject(selectedSubjectId);

// Load next page of questions for infinite scroll
const { data: moreQuestions, pagination: newPagination } = await questionService.searchQuestions({
  page: pagination.currentPage + 1,
  size: 20,
  difficulty: filters.difficulty,
  subjectId: filters.subjectId
});
```

#### Course Management Page  
```javascript
// Load all courses with pagination (default: page=0, size=20)
const { data: courses, pagination } = await courseService.getCourses();

// Load subjects for a specific course with pagination
const { data: subjects } = await courseService.getSubjects(courseId, { page: 0, size: 20 });

// Load all subjects for the institute (from JWT) with pagination
const { data: allSubjects } = await courseService.getSubjects(null, { page: 0, size: 20 });

// Load more courses for infinite scroll
const { data: moreCourses } = await courseService.getCourses({ 
  page: pagination.currentPage + 1, 
  size: 20 
});
```

#### User Management Pages
```javascript
// Search students with optional batch filter with pagination (default: page=0, size=20)
// Uses POST /students/search/advanced
const { data: students, pagination: studentPagination } = await newUserService.getStudentsByBatch(batchId);

// Search all teachers with pagination (default: page=0, size=20)  
// Uses POST /teachers/search/advanced
const { data: teachers, pagination: teacherPagination } = await newUserService.getTeachers();

// Load more students for infinite scroll
const { data: moreStudents } = await newUserService.getStudentsByBatch(batchId, { 
  page: studentPagination.currentPage + 1, 
  size: 20 
});

// Load more teachers for infinite scroll  
const { data: moreTeachers } = await newUserService.getTeachers({ 
  page: teacherPagination.currentPage + 1, 
  size: 20 
});

// Register new teacher (instituteId from JWT) - Uses POST /teachers
const { data } = await newUserService.registerTeacher({
  email: 'teacher@example.com',
  password: 'password123',
  firstName: 'John',
  lastName: 'Doe'
});
```

#### Institute Management (Super Admin)
```javascript
// Search institutes by name with pagination (default: page=0, size=20)
// Uses POST /institutes/search/advanced
const { data: institutes, pagination } = await newInstituteService.searchInstitutes('Tech University');

// Get all institutes with optional name filter
const { data: allInstitutes, pagination: instPagination } = await newInstituteService.getInstitutes({ 
  search: 'university' 
});

// Load more institutes for infinite scroll
const { data: moreInstitutes } = await newInstituteService.getInstitutes({ 
  search: searchTerm 
}, { 
  page: pagination.currentPage + 1, 
  size: 20 
});
```

## Benefits of Entity-Specific Search Architecture

1. **Entity-Specific Endpoints**: Dedicated search endpoints for each entity type with specialized functionality
2. **JWT-Based Security**: Institute context extracted from JWT tokens, no need to pass instituteId
3. **Advanced Filtering**: Rich criteria-based filtering for all entity types
4. **Built-in Pagination**: Consistent pagination across all searches
5. **Flexible Sorting**: Configurable sorting by any field in any direction
6. **Type Safety**: Consistent response structures across all endpoints
7. **Clear Separation**: Each entity has its own optimized search logic and validation
8. **Better Error Handling**: Entity-specific error messages and validation
9. **Scalable Architecture**: Each endpoint can be optimized independently

## Response Format

### Search API Response
```javascript
{
  data: {
    content: Array,        // The actual data array
    totalElements: Number, // Total number of records
    totalPages: Number,    // Total number of pages
    number: Number,        // Current page number (0-based)
    size: Number,          // Page size
    hasMore: Boolean       // Whether more pages exist
  },
  error: String|null,      // Error message if any
  success: Boolean         // Success indicator
}
```

### CRUD API Response
```javascript
{
  data: Object,            // Created/updated entity
  error: String|null,      // Error message if any
  success: Boolean         // Success indicator
}
```

## JWT Token Requirements

All API requests require a valid JWT token containing:
- `instituteId` - Automatically used for filtering institute-specific data
- User role and permissions for authorization
- Token expiration and validation

**No need to explicitly pass instituteId in request parameters anymore!**
