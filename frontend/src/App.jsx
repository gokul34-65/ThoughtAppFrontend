import { Routes, Route, Navigate, useNavigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from './api';
import { useParams } from 'react-router-dom';

function useAuth() {
  return Boolean(localStorage.getItem('token'));
}

function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const isAuth = useAuth();
  useEffect(() => {
    if (!isAuth) {
      setIsAdmin(false);
      return;
    }
    async function checkAdmin() {
      try {
        await api.get('/admin/users');
        setIsAdmin(true);
      } catch {
        setIsAdmin(false);
      }
    }
    checkAdmin();
  }, [isAuth]);
  return isAdmin;
}

function PrivateRoute({ children }) {
  const isAuth = useAuth();
  return isAuth ? children : <Navigate to="/login" />;
}

function NavBar() {
  const isAuth = useAuth();
  const isAdmin = useIsAdmin();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <nav style={{ display: 'flex', gap: 16, padding: 16, borderBottom: '1px solid #eee', marginBottom: 24 }}>
      <Link to="/">Home</Link>
      {isAuth ? (
        <>
          <Link to="/feed">Feed</Link>
          <Link to="/myposts">My Posts</Link>
          <Link to="/starred">Starred Posts</Link>
          <Link to="/profile">Profile</Link>
          {isAdmin && <Link to="/admin">Admin</Link>}
          <button onClick={handleLogout} style={{ cursor: 'pointer' }}>Logout</button>
        </>
      ) : (
        <>
          <Link to="/login">Login</Link>
          <Link to="/register">Register</Link>
        </>
      )}
    </nav>
  );
}

function getCurrentUsername() {
  // Try to get username from JWT in localStorage (assumes JWT payload has 'sub' or 'username')
  const token = localStorage.getItem('token');
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.sub || payload.username || null;
  } catch {
    return null;
  }
}

function FollowButton({ username, isFollowing, onToggle }) {
  const currentUser = getCurrentUsername();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!username || username === currentUser) return null;

  const handleFollow = async () => {
    setLoading(true);
    setError('');
    try {
      await api.post(`/user/follow/${username}`);
      onToggle(username, true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to follow user');
    } finally {
      setLoading(false);
    }
  };

  const handleUnfollow = async () => {
    setLoading(true);
    setError('');
    try {
      await api.delete(`/user/follow/${username}`);
      onToggle(username, false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to unfollow user');
    } finally {
      setLoading(false);
    }
  };

  if (isFollowing === undefined) return <span style={{ marginLeft: 8 }}>...</span>;
  return (
    <span style={{ marginLeft: 8 }}>
      {isFollowing ? (
        <button onClick={handleUnfollow} disabled={loading} style={{ fontSize: '0.9em' }}>Unfollow</button>
      ) : (
        <button onClick={handleFollow} disabled={loading} style={{ fontSize: '0.9em' }}>Follow</button>
      )}
      {error && <span style={{ color: 'red', marginLeft: 4 }}>{error}</span>}
    </span>
  );
}

function useFollowStatus(usernames) {
  const [followStatus, setFollowStatus] = useState({});

  useEffect(() => {
    let cancelled = false;
    async function fetchStatuses() {
      const statusMap = {};
      await Promise.all(usernames.map(async username => {
        try {
          const res = await api.get(`/user/follow/${username}`);
          statusMap[username] = res.data === true;
        } catch {
          statusMap[username] = false;
        }
      }));
      if (!cancelled) setFollowStatus(statusMap);
    }
    if (usernames.length > 0) fetchStatuses();
    return () => { cancelled = true; };
  }, [usernames.join(",")]);

  const handleToggle = (username, isNowFollowing) => {
    setFollowStatus(prev => ({ ...prev, [username]: isNowFollowing }));
  };

  return [followStatus, handleToggle];
}

function StarButton({ postId }) {
  const [starred, setStarred] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchStarStatus = async () => {
    setLoading(true);
    setError('');
    try {
      // Check if this post is in the user's starred posts
      const res = await api.get('/user/starred');
      setStarred(res.data.some(post => post.id === postId));
    } catch {
      setStarred(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStarStatus();
    // eslint-disable-next-line
  }, [postId]);

  const handleStar = async () => {
    setActionLoading(true);
    setError('');
    try {
      await api.post(`/user/star/${postId}`);
      setStarred(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to star post');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnstar = async () => {
    setActionLoading(true);
    setError('');
    try {
      await api.delete(`/user/unstar/${postId}`);
      setStarred(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to unstar post');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <span style={{ marginLeft: 8 }}>☆</span>;
  return (
    <span style={{ marginLeft: 8 }}>
      {starred ? (
        <button onClick={handleUnstar} disabled={actionLoading} title="Unstar" style={{ fontSize: '1.2em', color: '#f5c518' }}>★</button>
      ) : (
        <button onClick={handleStar} disabled={actionLoading} title="Star" style={{ fontSize: '1.2em' }}>☆</button>
      )}
      {error && <span style={{ color: 'red', marginLeft: 4 }}>{error}</span>}
    </span>
  );
}

function Comments({ postId }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newComment, setNewComment] = useState('');
  const [commentError, setCommentError] = useState('');
  const [commentSuccess, setCommentSuccess] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const currentUser = getCurrentUsername();

  const fetchComments = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/user/comment/${postId}`);
      setComments(res.data);
    } catch (err) {
      setError('Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
    // eslint-disable-next-line
  }, [postId]);

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    setCommentError('');
    setCommentSuccess('');
    if (!newComment.trim()) {
      setCommentError('Comment cannot be empty');
      return;
    }
    try {
      await api.post(`/user/comment/${postId}`, { content: newComment });
      setCommentSuccess('Comment added successfully!');
      setNewComment('');
      fetchComments();
    } catch (err) {
      setCommentError(err.response?.data?.error || 'Failed to add comment');
    }
  };

  const handleEdit = (comment) => {
    setEditingId(comment.id);
    setEditContent(comment.content);
  };

  const handleEditSubmit = async (e, commentId) => {
    e.preventDefault();
    try {
      await api.put(`/user/comment/update/${commentId}`, { content: editContent });
      setEditingId(null);
      setEditContent('');
      fetchComments();
    } catch (err) {
      setCommentError(err.response?.data?.error || 'Failed to update comment');
    }
  };

  const handleDelete = async (commentId) => {
    try {
      await api.delete(`/user/comment/delete/${commentId}`);
      fetchComments();
    } catch (err) {
      setCommentError(err.response?.data?.error || 'Failed to delete comment');
    }
  };

  return (
    <div style={{ marginTop: 12, paddingLeft: 16, borderLeft: '2px solid #eee' }}>
      <h4 style={{ margin: '8px 0' }}>Comments</h4>
      <form onSubmit={handleCommentSubmit} style={{ marginBottom: 8 }}>
        <input
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          style={{ width: '70%', color: '#111', background: '#fff' }}
        />
        <button type="submit" style={{ marginLeft: 8 }}>Comment</button>
        {commentError && <div style={{ color: 'red' }}>{commentError}</div>}
        {commentSuccess && <div style={{ color: 'green' }}>{commentSuccess}</div>}
      </form>
      {loading && <div>Loading comments...</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {comments.length === 0 && !loading && <div>No comments yet.</div>}
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {comments.map(comment => (
          <li key={comment.id} className="comment-card">
            <b className="comment-author">@{comment.userName}</b>
            {editingId === comment.id ? (
              <form onSubmit={e => handleEditSubmit(e, comment.id)} style={{ display: 'inline', marginLeft: 8 }}>
                <input
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  style={{ width: '60%', color: '#111', background: '#fff' }}
                />
                <button type="submit" style={{ marginLeft: 4 }}>Save</button>
                <button type="button" style={{ marginLeft: 4 }} onClick={() => setEditingId(null)}>Cancel</button>
              </form>
            ) : (
              <span style={{ marginLeft: 8 }}>{comment.content}</span>
            )}
            {currentUser && comment.userName === currentUser && editingId !== comment.id && (
              <>
                <button style={{ marginLeft: 8 }} onClick={() => handleEdit(comment)}>Edit</button>
                <button style={{ marginLeft: 4 }} onClick={() => handleDelete(comment.id)}>Delete</button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Home() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newPost, setNewPost] = useState('');
  const [postError, setPostError] = useState('');
  const [postSuccess, setPostSuccess] = useState('');

  useEffect(() => {
    fetchPosts();
    // eslint-disable-next-line
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/home/posts');
      setPosts(res.data);
    } catch (err) {
      setError('Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  // Centralize follow state for all usernames in the feed
  const usernames = Array.from(new Set(posts.map(post => post.username)));
  const [followStatus, handleFollowToggle] = useFollowStatus(usernames);

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    setPostError('');
    setPostSuccess('');
    if (!newPost.trim()) {
      setPostError('Post content cannot be empty');
      return;
    }
    try {
      await api.post('/user/post', { content: newPost });
      setPostSuccess('Post added successfully!');
      setNewPost('');
      fetchPosts();
    } catch (err) {
      setPostError(err.response?.data?.error || 'Failed to add post');
    }
  };

  return (
    <div className="main-feed">
      <h2>Public Feed</h2>
      <form onSubmit={handlePostSubmit} style={{ marginBottom: 24 }}>
        <div className="form-group">
          <textarea
            value={newPost}
            onChange={e => setNewPost(e.target.value)}
            placeholder="What's on your mind?"
            rows={3}
            style={{ width: '100%', resize: 'vertical' }}
          />
        </div>
        <button type="submit">Post</button>
        {postError && <div style={{ color: 'red' }}>{postError}</div>}
        {postSuccess && <div style={{ color: 'green' }}>{postSuccess}</div>}
      </form>
      {loading && <div>Loading...</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {posts.length === 0 && !loading && <div>No posts yet.</div>}
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {posts.map(post => (
          <li key={post.id} className="card">
            <div>
              <b><Link to={`/user/${post.username}`}>@{post.username}</Link></b>
              <FollowButton
                username={post.username}
                isFollowing={followStatus[post.username]}
                onToggle={handleFollowToggle}
              />
              <StarButton postId={post.id} />
            </div>
            <div>{post.content}</div>
            <Comments postId={post.id} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await api.post('/auth/login', { username, password });
      localStorage.setItem('token', res.data.replace('Bearer ', ''));
      navigate('/feed');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div style={{ maxWidth: 350, margin: '2rem auto' }}>
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Username</label>
          <input value={username} onChange={e => setUsername(e.target.value)} required />
        </div>
        <div>
          <label>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        {error && <div style={{ color: 'red' }}>{error}</div>}
        <button type="submit">Login</button>
      </form>
      <p>Don't have an account? <Link to="/register">Register</Link></p>
    </div>
  );
}

function Register() {
  const [form, setForm] = useState({ username: '', password: '', displayName: '', bio: '', location: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await api.post('/auth/register', form);
      setSuccess('Registration successful! Please log in.');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    }
  };

  return (
    <div style={{ maxWidth: 350, margin: '2rem auto' }}>
      <h2>Register</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Username</label>
          <input name="username" value={form.username} onChange={handleChange} required />
        </div>
        <div>
          <label>Password</label>
          <input type="password" name="password" value={form.password} onChange={handleChange} required />
        </div>
        <div>
          <label>Display Name</label>
          <input name="displayName" value={form.displayName} onChange={handleChange} />
        </div>
        <div>
          <label>Bio</label>
          <input name="bio" value={form.bio} onChange={handleChange} />
        </div>
        <div>
          <label>Location</label>
          <input name="location" value={form.location} onChange={handleChange} />
        </div>
        {error && <div style={{ color: 'red' }}>{error}</div>}
        {success && <div style={{ color: 'green' }}>{success}</div>}
        <button type="submit">Register</button>
      </form>
      <p>Already have an account? <Link to="/login">Login</Link></p>
    </div>
  );
}

function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ displayName: '', bio: '', location: '' });
  const [success, setSuccess] = useState('');
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      setLoading(true);
      setError('');
      try {
        const res = await api.get('/user/me');
        setProfile(res.data);
        setForm({
          displayName: res.data.displayName || '',
          bio: res.data.bio || '',
          location: res.data.location || '',
        });
      } catch (err) {
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  const handleEdit = () => {
    setEditing(true);
    setSuccess('');
    setError('');
  };

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await api.put('/user/profile', form);
      setProfile({ ...profile, ...form });
      setSuccess('Profile updated successfully!');
      setEditing(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile');
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '2rem auto' }}>
      <h2>My Profile</h2>
      {loading && <div>Loading...</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {success && <div style={{ color: 'green' }}>{success}</div>}
      {profile && !editing && (
        <div style={{ border: '1px solid #ccc', borderRadius: 8, padding: 16 }}>
          <div><b>Display Name:</b> {profile.displayName}</div>
          <div><b>Bio:</b> {profile.bio}</div>
          <div><b>Location:</b> {profile.location}</div>
          <button style={{ marginTop: 16, marginRight: 8 }} onClick={handleEdit}>Edit Profile</button>
          <button style={{ marginTop: 16, marginRight: 8 }} onClick={() => setShowFollowers(f => !f)}>
            {showFollowers ? 'Hide Followers' : 'View Followers'}
          </button>
          <button style={{ marginTop: 16 }} onClick={() => setShowFollowing(f => !f)}>
            {showFollowing ? 'Hide Following' : 'View Following'}
          </button>
        </div>
      )}
      {editing && (
        <form onSubmit={handleSubmit} style={{ border: '1px solid #ccc', borderRadius: 8, padding: 16 }}>
          <div>
            <label>Display Name</label>
            <input name="displayName" value={form.displayName} onChange={handleChange} />
          </div>
          <div>
            <label>Bio</label>
            <input name="bio" value={form.bio} onChange={handleChange} />
          </div>
          <div>
            <label>Location</label>
            <input name="location" value={form.location} onChange={handleChange} />
          </div>
          <button type="submit" style={{ marginTop: 16 }}>Save</button>
          <button type="button" style={{ marginLeft: 8 }} onClick={() => setEditing(false)}>Cancel</button>
        </form>
      )}
      {showFollowers && <Followers />}
      {showFollowing && <FollowingList />}
    </div>
  );
}
function Feed() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchFeed();
    // eslint-disable-next-line
  }, []);

  const fetchFeed = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/user/personalFeed');
      setPosts(res.data);
    } catch (err) {
      setError('Failed to load personal feed');
    } finally {
      setLoading(false);
    }
  };

  // Centralize follow state for all usernames in the feed
  const usernames = Array.from(new Set(posts.map(post => post.username)));
  const [followStatus, handleFollowToggle] = useFollowStatus(usernames);

  return (
    <div className="main-feed">
      <h2>Personal Feed</h2>
      {loading && <div>Loading...</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {posts.length === 0 && !loading && <div>No posts from users you follow yet.</div>}
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {posts.map(post => (
          <li key={post.id} className="card">
            <div>
              <b><Link to={`/user/${post.username}`}>@{post.username}</Link></b>
              <FollowButton
                username={post.username}
                isFollowing={followStatus[post.username]}
                onToggle={handleFollowToggle}
              />
              <StarButton postId={post.id} />
            </div>
            <div>{post.content}</div>
            <Comments postId={post.id} />
          </li>
        ))}
      </ul>
    </div>
  );
}
function Admin() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showUsers, setShowUsers] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data);
      setShowUsers(true);
    } catch (err) {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '2rem auto' }}>
      <h2>Admin Dashboard</h2>
      <button onClick={fetchUsers} style={{ marginBottom: 16 }}>Show All Users</button>
      {loading && <div>Loading users...</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {showUsers && (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {users.map((user, idx) => (
            <li key={idx} style={{ border: '1px solid #ccc', borderRadius: 8, margin: '1rem 0', padding: 16 }}>
              <div><b>Username:</b> {user.username}</div>
              <div><b>Display Name:</b> {user.displayName}</div>
              <div><b>Bio:</b> {user.bio}</div>
              <div><b>Location:</b> {user.location}</div>
              <div><b>Roles:</b> {user.roles && user.roles.map(r => r.name).join(', ')}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MyPosts() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  const fetchMyPosts = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/user/myposts');
      setPosts(res.data);
    } catch (err) {
      setError('Failed to load your posts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyPosts();
  }, []);

  const handleEdit = (post) => {
    setEditingId(post.id);
    setEditContent(post.content);
    setActionMsg('');
  };

  const handleEditSubmit = async (e, postId) => {
    e.preventDefault();
    setActionMsg('');
    try {
      await api.put(`/user/post/update/${postId}`, { content: editContent });
      setActionMsg('Post updated successfully!');
      setEditingId(null);
      fetchMyPosts();
    } catch (err) {
      setActionMsg(err.response?.data?.error || 'Failed to update post');
    }
  };

  const handleDelete = async (postId) => {
    setActionMsg('');
    try {
      await api.delete(`/user/post/delete/${postId}`);
      setActionMsg('Post deleted successfully!');
      fetchMyPosts();
    } catch (err) {
      setActionMsg(err.response?.data?.error || 'Failed to delete post');
    }
  };

  return (
    <div className="main-feed">
      <h2>My Posts</h2>
      {loading && <div>Loading...</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {actionMsg && <div style={{ color: actionMsg.includes('success') ? 'green' : 'red' }}>{actionMsg}</div>}
      {posts.length === 0 && !loading && <div>You have not posted anything yet.</div>}
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {posts.map(post => (
          <li key={post.id} className="card">
            <div>
              {editingId === post.id ? (
                <form onSubmit={e => handleEditSubmit(e, post.id)}>
                  <textarea
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    rows={3}
                    style={{ width: '100%', resize: 'vertical', marginBottom: 8 }}
                  />
                  <br />
                  <button type="submit">Save</button>
                  <button type="button" style={{ marginLeft: 8 }} onClick={() => setEditingId(null)}>Cancel</button>
                </form>
              ) : (
    <>
      <div>
                    <b>Me</b>
                    <StarButton postId={post.id} />
                  </div>
                  <div>{post.content}</div>
                  <button style={{ marginTop: 8, marginRight: 8 }} onClick={() => handleEdit(post)}>Edit</button>
                  <button style={{ marginTop: 8 }} onClick={() => handleDelete(post.id)}>Delete</button>
                </>
              )}
            </div>
            <Comments postId={post.id} />
          </li>
        ))}
      </ul>
      </div>
  );
}

function UserProfile() {
  const { username } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followError, setFollowError] = useState('');

  useEffect(() => {
    async function fetchProfile() {
      setLoading(true);
      setError('');
      try {
        const res = await api.get(`/user/${username}`);
        setProfile(res.data);
      } catch (err) {
        setError('Failed to load user profile');
      } finally {
        setLoading(false);
      }
    }
    async function fetchFollowStatus() {
      try {
        const res = await api.get(`/user/follow/${username}`);
        setIsFollowing(res.data === true);
      } catch {
        setIsFollowing(false);
      }
    }
    fetchProfile();
    fetchFollowStatus();
  }, [username]);

  const handleFollow = async () => {
    setFollowLoading(true);
    setFollowError('');
    try {
      await api.post(`/user/follow/${username}`);
      setIsFollowing(true);
    } catch (err) {
      setFollowError(err.response?.data?.error || 'Failed to follow user');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleUnfollow = async () => {
    setFollowLoading(true);
    setFollowError('');
    try {
      await api.delete(`/user/follow/${username}`);
      setIsFollowing(false);
    } catch (err) {
      setFollowError(err.response?.data?.error || 'Failed to unfollow user');
    } finally {
      setFollowLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '2rem auto' }}>
      <h2>User Profile</h2>
      {loading && <div>Loading...</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {profile && (
        <div style={{ border: '1px solid #ccc', borderRadius: 8, padding: 16 }}>
          <div><b>Display Name:</b> {profile.displayName}</div>
          <div><b>Bio:</b> {profile.bio}</div>
          <div><b>Location:</b> {profile.location}</div>
          <div style={{ marginTop: 16 }}>
            {isFollowing ? (
              <button onClick={handleUnfollow} disabled={followLoading}>
                Unfollow
              </button>
            ) : (
              <button onClick={handleFollow} disabled={followLoading}>
                Follow
        </button>
            )}
            {followError && <div style={{ color: 'red', marginTop: 8 }}>{followError}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function Followers() {
  const [followers, setFollowers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchFollowers() {
      setLoading(true);
      setError('');
      try {
        const res = await api.get('/user/followers');
        setFollowers(res.data);
      } catch (err) {
        setError('Failed to load followers');
      } finally {
        setLoading(false);
      }
    }
    fetchFollowers();
  }, []);

  return (
    <div style={{ maxWidth: 400, margin: '2rem auto' }}>
      <h2>My Followers</h2>
      {loading && <div>Loading...</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {followers.length === 0 && !loading && <div>You have no followers yet.</div>}
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {followers.map((user, idx) => (
          <li key={idx} style={{ border: '1px solid #ccc', borderRadius: 8, margin: '1rem 0', padding: 16 }}>
            <div><b>{user.displayName}</b></div>
            <div>{user.bio}</div>
            <div>{user.location}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FollowingList() {
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchFollowing() {
      setLoading(true);
      setError('');
      try {
        const res = await api.get('/user/following');
        setFollowing(res.data);
      } catch (err) {
        setError('Failed to load following list.');
      } finally {
        setLoading(false);
      }
    }
    fetchFollowing();
  }, []);

  return (
    <div style={{ maxWidth: 400, margin: '1rem auto' }}>
      <h3>Following</h3>
      {loading && <div>Loading...</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {following.length === 0 && !loading && !error && <div>You are not following anyone yet.</div>}
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {following.map((user, idx) => (
          <li key={idx} style={{ border: '1px solid #ccc', borderRadius: 8, margin: '1rem 0', padding: 16 }}>
            <div><b>{user.displayName}</b></div>
            <div>{user.bio}</div>
            <div>{user.location}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StarredPosts() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchStarred() {
      setLoading(true);
      setError('');
      try {
        const res = await api.get('/user/starred');
        setPosts(res.data);
      } catch (err) {
        setError('Failed to load starred posts');
      } finally {
        setLoading(false);
      }
    }
    fetchStarred();
  }, []);

  return (
    <div style={{ maxWidth: 600, margin: '2rem auto' }}>
      <h2>Starred Posts</h2>
      {loading && <div>Loading...</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {posts.length === 0 && !loading && <div>You have not starred any posts yet.</div>}
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {posts.map(post => (
          <li key={post.id} style={{ border: '1px solid #ccc', borderRadius: 8, margin: '1rem 0', padding: 16 }}>
            <div><b><Link to={`/user/${post.username}`}>@{post.username}</Link></b></div>
            <div>{post.content}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function App() {
  return (
    <>
      <NavBar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<PrivateRoute><Home /></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
        <Route path="/feed" element={<PrivateRoute><Feed /></PrivateRoute>} />
        <Route path="/myposts" element={<PrivateRoute><MyPosts /></PrivateRoute>} />
        <Route path="/starred" element={<PrivateRoute><StarredPosts /></PrivateRoute>} />
        <Route path="/user/:username" element={<PrivateRoute><UserProfile /></PrivateRoute>} />
        <Route path="/admin" element={<PrivateRoute><Admin /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}

export default App;
