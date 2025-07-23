# Social Media API Documentation

## Overview
This is a RESTful API for a social media platform built with Spring Boot. The API supports user registration, authentication, posting, following users, starring posts, and commenting.

## Authentication
The API uses JWT (JSON Web Token) for authentication. After logging in, include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Base URL
```
http://localhost:8080
```

---

## Authentication Endpoints (`/auth`)

### Register User
**POST** `/auth/register`

Register a new user account.

**Request Body:**
```json
{
  "username": "john_doe",
  "password": "securePassword123",
  "displayName": "John Doe",
  "bio": "Software developer from NYC",
  "location": "New York, NY"
}
```

**Responses:**
- `201 Created`: User successfully registered
- `400 Bad Request`: Validation errors or missing required fields
- `409 Conflict`: Username already exists

**Example:**
```bash
curl -X POST http://localhost:8080/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "password": "securePassword123",
    "displayName": "John Doe"
  }'
```

### Login
**POST** `/auth/login`

Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "username": "john_doe",
  "password": "securePassword123"
}
```

**Response:**
```
Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJqb2huX2RvZSI...
```

**Example:**
```bash
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "password": "securePassword123"
  }'
```

---

## Public Endpoints (`/home`)

### Welcome Message
**GET** `/home/`

Returns a welcome message.

**Response:** `"Hello World"`

### Get All Posts
**GET** `/home/posts`

Retrieve all posts from all users (public feed).

**Response:**
```json
[
  {
    "id": 1,
    "content": "Hello world! This is my first post.",
    "username": "john_doe"
  },
  {
    "id": 2,
    "content": "Beautiful sunset today!",
    "username": "jane_smith"
  }
]
```

---

## User Management Endpoints (`/user`)

### Get User Profile
**GET** `/user/{username}`

Get public profile information for a specific user.

**Parameters:**
- `username` (path): Username of the user

**Response:**
```json
{
  "displayName": "John Doe",
  "bio": "Software developer from NYC",
  "location": "New York, NY"
}
```

### Get Current User Profile
**GET** `/user/me`
🔒 **Requires Authentication**

Get your own profile information.

**Response:**
```json
{
  "displayName": "John Doe",
  "bio": "Software developer from NYC",
  "location": "New York, NY"
}
```

### Update Profile
**PUT** `/user/profile`
🔒 **Requires Authentication**

Update your profile information.

**Request Body:**
```json
{
  "displayName": "John Smith",
  "bio": "Full-stack developer",
  "location": "San Francisco, CA"
}
```

**Response:** `"updation successful"`

---

## Post Management

### Create Post
**POST** `/user/post`
🔒 **Requires Authentication**

Create a new post.

**Request Body:**
```json
{
  "content": "This is my new post!"
}
```

**Response:** `"Post added successfully"`

### Get Personal Feed
**GET** `/user/personalFeed`
🔒 **Requires Authentication**

Get posts from users you follow.

**Response:**
```json
[
  {
    "id": 1,
    "content": "Hello from a user you follow!",
    "username": "followed_user"
  }
]
```

### Get Your Posts
**GET** `/user/myposts`
🔒 **Requires Authentication**

Get all your own posts.

### Get Specific Post
**GET** `/user/post/{post_id}`
🔒 **Requires Authentication**

Get a specific post by ID.

**Parameters:**
- `post_id` (path): ID of the post

### Update Post
**PUT** `/user/post/update/{post_id}`
🔒 **Requires Authentication**

Update your own post.

**Request Body:**
```json
{
  "content": "Updated post content"
}
```

**Responses:**
- `200 OK`: Post updated successfully
- `401 Unauthorized`: Not your post
- `404 Not Found`: Post not found

### Delete Post
**DELETE** `/user/post/delete/{post_id}`
🔒 **Requires Authentication**

Delete your own post.

**Parameters:**
- `post_id` (path): ID of the post to delete

---

## Following System

### Follow User
**POST** `/user/follow/{username}`
🔒 **Requires Authentication**

Follow another user.

**Parameters:**
- `username` (path): Username to follow

**Responses:**
- `200 OK`: Successfully following user
- `409 Conflict`: Already following this user
- `404 Not Found`: User not found

### Unfollow User
**DELETE** `/user/follow/{username}`
🔒 **Requires Authentication**

Stop following a user.

**Parameters:**
- `username` (path): Username to unfollow

### Check if Following
**GET** `/user/follow/{username}`
🔒 **Requires Authentication**

Check if you're following a specific user.

**Response:** `true` or `false`

### Get Your Followers
**GET** `/user/followers`
🔒 **Requires Authentication**

Get list of users who follow you.

**Response:**
```json
[
  {
    "displayName": "Jane Smith",
    "bio": "Designer",
    "location": "Chicago, IL"
  }
]
```

---

## Star System (Like Posts)

### Star a Post
**POST** `/user/star/{post_id}`
🔒 **Requires Authentication**

Star (like) a post.

**Parameters:**
- `post_id` (path): ID of the post to star

**Responses:**
- `200 OK`: Star added successfully
- `409 Conflict`: Already starred this post
- `404 Not Found`: Post not found

### Unstar a Post
**DELETE** `/user/unstar/{post_id}`
🔒 **Requires Authentication**

Remove star from a post.

**Parameters:**
- `post_id` (path): ID of the post to unstar

### Get Starred Posts
**GET** `/user/starred`
🔒 **Requires Authentication**

Get all posts you've starred.

**Response:**
```json
[
  {
    "id": 1,
    "content": "A post I starred",
    "username": "other_user"
  }
]
```

---

## Comments System

### Add Comment
**POST** `/user/comment/{post_id}`
🔒 **Requires Authentication**

Add a comment to a post.

**Parameters:**
- `post_id` (path): ID of the post to comment on

**Request Body:**
```json
{
  "content": "Great post!"
}
```

**Response:** `"Comment added successfully"`

### Get Comments
**GET** `/user/comment/{post_id}`
🔒 **Requires Authentication**

Get all comments for a post.

**Parameters:**
- `post_id` (path): ID of the post

**Response:**
```json
[
  {
    "id": 1,
    "content": "Great post!",
    "userName": "commenter_username",
    "postId": 1
  }
]
```

### Update Comment
**PUT** `/user/comment/update/{comment_id}`
🔒 **Requires Authentication**

Update your own comment.

**Parameters:**
- `comment_id` (path): ID of the comment to update

**Request Body:**
```json
{
  "content": "Updated comment text"
}
```

**Responses:**
- `200 OK`: Comment updated successfully
- `401 Unauthorized`: Not your comment
- `400 Bad Request`: Comment not found

### Delete Comment
**DELETE** `/user/comment/delete/{comment_id}`
🔒 **Requires Authentication**

Delete your own comment.

**Parameters:**
- `comment_id` (path): ID of the comment to delete

---

## Admin Endpoints (`/admin`)
🔒 **Requires ADMIN Role**

### Get All Users
**GET** `/admin/users`

Get a list of all registered users (admin only).

**Response:**
```json
[
  {
    "username": "john_doe",
    "displayName": "John Doe",
    "bio": "Software developer",
    "location": "New York, NY",
    "roles": [
      {
        "id": 2,
        "name": "USER"
      }
    ]
  }
]
```

### Add Role
**POST** `/user/addRole`
🔒 **Requires Authentication**

Add a new role to the system.

**Request Body:**
```json
{
  "id": 3,
  "name": "MODERATOR"
}
```

---

## Error Responses

The API returns standard HTTP status codes:

- `200 OK`: Successful request
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Authentication required or invalid credentials
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource already exists

**Error Response Format:**
```json
{
  "error": "Error message describing what went wrong"
}
```

---

## Getting Started

1. **Register a new account:**
   ```bash
   curl -X POST http://localhost:8080/auth/register \
     -H "Content-Type: application/json" \
     -d '{"username": "testuser", "password": "password123", "displayName": "Test User"}'
   ```

2. **Login to get your JWT token:**
   ```bash
   curl -X POST http://localhost:8080/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username": "testuser", "password": "password123"}'
   ```

3. **Use the token for authenticated requests:**
   ```bash
   curl -X GET http://localhost:8080/user/me \
     -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
   ```

4. **Create your first post:**
   ```bash
   curl -X POST http://localhost:8080/user/post \
     -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
     -H "Content-Type: application/json" \
     -d '{"content": "Hello, world! This is my first post."}'
   ```

## Notes

- JWT tokens expire after 1 hour
- Default role for new users is "USER" 
- Admin users have access to additional endpoints
- All authenticated endpoints require the `Authorization: Bearer <token>` header
- The API uses PostgreSQL database running on localhost:5432