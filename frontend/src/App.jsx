import { Routes, Route, Navigate, useNavigate, Link } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import api from './api';
import { useParams } from 'react-router-dom';
import './theme.css';
import { FaRegComment, FaShare, FaRegImage, FaRegStar, FaStar } from 'react-icons/fa';

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

function getInitials(name) {
  if (!name) return '?';
  const parts = name.split(' ');
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function NavBar() {
  const isAuth = useAuth();
  const isAdmin = useIsAdmin();
  const navigate = useNavigate();
  const username = getCurrentUsername();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <nav>
      <div className="nav-brand">
        <span style={{fontWeight:900, fontSize:'1.5em', color:'var(--color-primary)'}}>ThoughtApp</span>
      </div>
      <div className="nav-links">
        <Link to="/">Home</Link>
        {isAuth ? (
          <>
            <Link to="/feed">Feed</Link>
            <Link to="/myposts">My Posts</Link>
            <Link to="/starred">Starred</Link>
            <Link to="/profile" aria-label="Profile" className="avatar avatar-btn" title={username} style={{marginLeft:'0.5rem'}}>{getInitials(username)}</Link>
            {isAdmin && <Link to="/admin">Admin</Link>}
            <button onClick={handleLogout}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </div>
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
    <div className="mt-2">
      <h4 className="mb-1">Comments</h4>
      <form onSubmit={handleCommentSubmit} className="mb-1 flex" style={{alignItems:'center', gap:'0.5rem'}}>
        <input
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          type="text"
          style={{flex:1, marginBottom:0}}
        />
        <button type="submit" aria-label="Send comment" style={{display:'flex', alignItems:'center', justifyContent:'center', height:'2.6em', width:'2.6em', padding:0}}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 12H20M20 12L14 6M20 12L14 18" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </form>
      {commentError && <div className="text-danger mb-1">{commentError}</div>}
      {commentSuccess && <div className="text-success mb-1">{commentSuccess}</div>}
      {loading && <div>Loading comments...</div>}
      {error && <div className="text-danger mb-1">{error}</div>}
      {comments.length === 0 && !loading && <div>No comments yet.</div>}
      <ul>
        {comments.map(comment => (
          <li key={comment.id} className="card compact">
            <div className="user-header mb-1">
              <span className="avatar" title={comment.userName}>{getInitials(comment.userName)}</span>
              <span className="user-name">@{comment.userName}</span>
            </div>
            <div style={{flex:1, display:'flex', flexDirection:'column'}}>
              {editingId === comment.id ? (
                <form onSubmit={e => handleEditSubmit(e, comment.id)} className="flex gap-1 mb-1">
                  <input
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                  />
                  <button type="submit">Save</button>
                  <button type="button" onClick={() => setEditingId(null)}>Cancel</button>
                </form>
              ) : (
                <div className="mb-1" style={{wordBreak:'break-word', whiteSpace:'pre-line', marginLeft:'0.5rem', marginTop:'0.2rem'}}>{comment.content}</div>
              )}
              {currentUser && comment.userName === currentUser && editingId !== comment.id && (
                <div className="flex gap-1" style={{justifyContent:'flex-end'}}>
                  <button onClick={() => handleEdit(comment)}>Edit</button>
                  <button onClick={() => handleDelete(comment.id)}>Delete</button>
                </div>
              )}
            </div>
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
  const [showComments, setShowComments] = useState({});
  const toggleComments = useCallback((postId) => {
    setShowComments(prev => ({ ...prev, [postId]: !prev[postId] }));
  }, []);

  // Add state for starred posts
  const [starredPosts, setStarredPosts] = useState({});
  // Fetch starred status for all posts
  useEffect(() => {
    async function fetchStarred() {
      try {
        const res = await api.get('/user/starred');
        const map = {};
        res.data.forEach(post => { map[post.id] = true; });
        setStarredPosts(map);
      } catch {
        setStarredPosts({});
      }
    }
    fetchStarred();
  }, [posts]);
  // Star/unstar handlers
  const handleStar = async (postId) => {
    try {
      await api.post(`/user/star/${postId}`);
      setStarredPosts(prev => ({ ...prev, [postId]: true }));
    } catch {}
  };
  const handleUnstar = async (postId) => {
    try {
      await api.delete(`/user/unstar/${postId}`);
      setStarredPosts(prev => ({ ...prev, [postId]: false }));
    } catch {}
  };

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
    <div className="container">
      <div className="main-feed">
        <h2 style={{fontWeight: 900, color: 'var(--color-primary)', marginBottom: '1.5rem'}}>Public Feed</h2>
        <form onSubmit={handlePostSubmit} className="mb-2" style={{background:'#f8fafc', borderRadius:'22px', padding:'1.2em 1.5em', boxShadow:'0 2px 8px rgba(30,41,59,0.08)', display:'flex', flexDirection:'column', gap:'1rem', marginBottom:'2.5rem'}}>
          <div style={{display:'flex', alignItems:'center', gap:'1rem'}}>
            <span className="avatar" title="You">{getInitials(getCurrentUsername() || 'U')}</span>
            <textarea
              value={newPost}
              onChange={e => setNewPost(e.target.value)}
              placeholder="What's on your mind?"
              rows={2}
              className="post-input"
              style={{resize:'none', margin:0, flex:1}}
            />
          </div>
          <div style={{display:'flex', alignItems:'center', justifyContent:'flex-end'}}>
            <button type="submit" className="post-btn">Post</button>
          </div>
          {postError && <div className="text-danger mt-1">{postError}</div>}
          {postSuccess && <div className="text-success mt-1">{postSuccess}</div>}
        </form>
        {loading && <div>Loading...</div>}
        {error && <div className="text-danger">{error}</div>}
        {posts.length === 0 && !loading && <div>No posts yet.</div>}
        <ul>
          {posts.map(post => (
            <li key={post.id} className="card" style={{padding:'2rem 2rem 1.2rem 2rem', marginBottom:'2.5rem'}}>
              <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'0.7rem'}}>
                <div style={{display:'flex', alignItems:'center', gap:'1rem'}}>
                  <span className="avatar" title={post.username}>{getInitials(post.username)}</span>
                  <div>
                    <span className="display-name">{post.username}</span>
                    <span className="username">@{post.username}</span>
                    <span className="timestamp">· 2h</span>
                  </div>
                </div>
              </div>
              <div className="mb-2" style={{fontSize:'1.13em', lineHeight:'1.6', marginLeft:'3.2rem'}}>{post.content}</div>
              <div className="action-bar">
                <button className="icon-btn" title="Comment" onClick={() => toggleComments(post.id)}>
                  <FaRegComment />
                  {/* Optionally show comment count here */}
                </button>
                <button className="icon-btn" title={starredPosts[post.id] ? 'Unstar' : 'Star'} onClick={() => starredPosts[post.id] ? handleUnstar(post.id) : handleStar(post.id)}>
                  {starredPosts[post.id] ? <FaStar style={{color:'#f5c518'}} /> : <FaRegStar />}
                </button>
              </div>
              {showComments[post.id] && <Comments postId={post.id} />}
            </li>
          ))}
        </ul>
      </div>
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
    <div className="card" style={{ maxWidth: 350, margin: '2rem auto' }}>
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Username</label>
          <input value={username} onChange={e => setUsername(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        {error && <div className="text-danger mb-1">{error}</div>}
        <button type="submit">Login</button>
      </form>
      <p className="mt-2 text-muted">Don't have an account? <Link to="/register">Register</Link></p>
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
    <div className="card" style={{ maxWidth: 350, margin: '2rem auto' }}>
      <h2>Register</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Username</label>
          <input name="username" value={form.username} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input type="password" name="password" value={form.password} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Display Name</label>
          <input name="displayName" value={form.displayName} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>Bio</label>
          <input name="bio" value={form.bio} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>Location</label>
          <input name="location" value={form.location} onChange={handleChange} />
        </div>
        {error && <div className="text-danger mb-1">{error}</div>}
        {success && <div className="text-success mb-1">{success}</div>}
        <button type="submit">Register</button>
      </form>
      <p className="mt-2 text-muted">Already have an account? <Link to="/login">Login</Link></p>
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
    <div className="container">
      <div className="profile-card flex gap-2">
        <div className="user-header">
          <span className="avatar" title={profile?.displayName || 'Me'}>{getInitials(profile?.displayName || 'Me')}</span>
          <span className="user-name">Me</span>
        </div>
        <div style={{flex:1}}>
          <h2>My Profile</h2>
          {loading && <div>Loading...</div>}
          {error && <div className="text-danger mb-1">{error}</div>}
          {success && <div className="text-success mb-1">{success}</div>}
          {profile && !editing && (
            <div>
              <div><b>Display Name:</b> {profile.displayName}</div>
              <div><b>Bio:</b> {profile.bio}</div>
              <div><b>Location:</b> {profile.location}</div>
              <button className="mt-2 mb-1" onClick={handleEdit}>Edit Profile</button>
              <button className="mt-2 mb-1" onClick={() => setShowFollowers(f => !f)}>
                {showFollowers ? 'Hide Followers' : 'View Followers'}
              </button>
              <button className="mt-2 mb-1" onClick={() => setShowFollowing(f => !f)}>
                {showFollowing ? 'Hide Following' : 'View Following'}
              </button>
            </div>
          )}
          {editing && (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Display Name</label>
                <input name="displayName" value={form.displayName} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Bio</label>
                <input name="bio" value={form.bio} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Location</label>
                <input name="location" value={form.location} onChange={handleChange} />
              </div>
              <button type="submit" className="mt-2">Save</button>
              <button type="button" className="mt-2 ml-1" onClick={() => setEditing(false)}>Cancel</button>
            </form>
          )}
          {showFollowers && <Followers />}
          {showFollowing && <FollowingList />}
        </div>
      </div>
    </div>
  );
}
function Feed() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showComments, setShowComments] = useState({});
  const toggleComments = useCallback((postId) => {
    setShowComments(prev => ({ ...prev, [postId]: !prev[postId] }));
  }, []);

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

  // Starred state for Feed
  const [starredPosts, setStarredPosts] = useState({});
  useEffect(() => {
    async function fetchStarred() {
      try {
        const res = await api.get('/user/starred');
        const map = {};
        res.data.forEach(post => { map[post.id] = true; });
        setStarredPosts(map);
      } catch {
        setStarredPosts({});
      }
    }
    fetchStarred();
  }, [posts]);
  const handleStar = async (postId) => {
    try {
      await api.post(`/user/star/${postId}`);
      setStarredPosts(prev => ({ ...prev, [postId]: true }));
    } catch {}
  };
  const handleUnstar = async (postId) => {
    try {
      await api.delete(`/user/unstar/${postId}`);
      setStarredPosts(prev => ({ ...prev, [postId]: false }));
    } catch {}
  };

  return (
    <div className="container">
      <div className="main-feed">
        <h2>Personal Feed</h2>
        {loading && <div>Loading...</div>}
        {error && <div className="text-danger mb-1">{error}</div>}
        {posts.length === 0 && !loading && <div>No posts from users you follow yet.</div>}
        <ul>
          {posts.map(post => (
            <li key={post.id} className="card" style={{padding:'2rem 2rem 1.2rem 2rem', marginBottom:'2.5rem'}}>
              <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'0.7rem'}}>
                <div style={{display:'flex', alignItems:'center', gap:'1rem'}}>
                  <span className="avatar" title={post.username}>{getInitials(post.username)}</span>
                  <div>
                    <span className="display-name">{post.username}</span>
                    <span className="username">@{post.username}</span>
                    <span className="timestamp">· 2h</span>
                  </div>
                </div>
              </div>
              <div className="mb-2" style={{fontSize:'1.13em', lineHeight:'1.6', marginLeft:'3.2rem'}}>{post.content}</div>
              <div className="action-bar">
                <button className="icon-btn" title="Comment" onClick={() => toggleComments(post.id)}>
                  <FaRegComment />
                </button>
                <button className="icon-btn" title={starredPosts[post.id] ? 'Unstar' : 'Star'} onClick={() => starredPosts[post.id] ? handleUnstar(post.id) : handleStar(post.id)}>
                  {starredPosts[post.id] ? <FaStar style={{color:'#f5c518'}} /> : <FaRegStar />}
                </button>
              </div>
              {showComments[post.id] && <Comments postId={post.id} />}
            </li>
          ))}
        </ul>
      </div>
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
    <div className="container">
      <div className="admin-card">
        <h2>Admin Dashboard</h2>
        <button className="mb-1" onClick={fetchUsers}>Show All Users</button>
        {loading && <div>Loading users...</div>}
        {error && <div className="text-danger mb-1">{error}</div>}
        {showUsers && (
          <ul>
            {users.map((user, idx) => (
              <li key={idx} className="flex gap-2 mb-1 card">
                <div className="user-header">
                  <span className="avatar" title={user.displayName}>{getInitials(user.displayName)}</span>
                  <span className="user-name">@{user.username}</span>
                </div>
                <div>
                  <div><b>Username:</b> {user.username}</div>
                  <div><b>Display Name:</b> {user.displayName}</div>
                  <div><b>Bio:</b> {user.bio}</div>
                  <div><b>Location:</b> {user.location}</div>
                  <div><b>Roles:</b> {user.roles && user.roles.map(r => r.name).join(', ')}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
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
  const [showComments, setShowComments] = useState({});
  const toggleComments = useCallback((postId) => {
    setShowComments(prev => ({ ...prev, [postId]: !prev[postId] }));
  }, []);

  // Starred state for MyPosts
  const [starredPosts, setStarredPosts] = useState({});
  useEffect(() => {
    async function fetchStarred() {
      try {
        const res = await api.get('/user/starred');
        const map = {};
        res.data.forEach(post => { map[post.id] = true; });
        setStarredPosts(map);
      } catch {
        setStarredPosts({});
      }
    }
    fetchStarred();
  }, [posts]);
  const handleStar = async (postId) => {
    try {
      await api.post(`/user/star/${postId}`);
      setStarredPosts(prev => ({ ...prev, [postId]: true }));
    } catch {}
  };
  const handleUnstar = async (postId) => {
    try {
      await api.delete(`/user/unstar/${postId}`);
      setStarredPosts(prev => ({ ...prev, [postId]: false }));
    } catch {}
  };

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

  const currentUsername = getCurrentUsername();

  return (
    <div className="container">
      <div className="main-feed">
        <h2>My Posts</h2>
        {loading && <div>Loading...</div>}
        {error && <div className="text-danger mb-1">{error}</div>}
        {actionMsg && <div className={actionMsg.includes('success') ? 'text-success mb-1' : 'text-danger mb-1'}>{actionMsg}</div>}
        {posts.length === 0 && !loading && <div>You have not posted anything yet.</div>}
        <ul>
          {posts.map(post => (
            <li key={post.id} className="card" style={{padding:'2rem 2rem 1.2rem 2rem', marginBottom:'2.5rem'}}>
              <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'0.7rem'}}>
                <div style={{display:'flex', alignItems:'center', gap:'1rem'}}>
                  <span className="avatar" title={currentUsername}>{getInitials(currentUsername)}</span>
                  <div>
                    <span className="display-name">{currentUsername}</span>
                    <span className="username">@{currentUsername}</span>
                    <span className="timestamp">· 2h</span>
                  </div>
                </div>
              </div>
              <div style={{flex:1}}>
                {editingId === post.id ? (
                  <form onSubmit={e => handleEditSubmit(e, post.id)}>
                    <textarea
                      value={editContent}
                      onChange={e => setEditContent(e.target.value)}
                      rows={3}
                      className="mb-1"
                      style={{ resize: 'vertical' }}
                    />
                    <button type="submit">Save</button>
                    <button type="button" className="ml-1" onClick={() => setEditingId(null)}>Cancel</button>
                  </form>
                ) : (
                  <>
                    <div className="mb-2" style={{fontSize:'1.13em', lineHeight:'1.6', marginLeft:'3.2rem'}}>{post.content}</div>
                    <div className="action-bar">
                      <button className="icon-btn" title="Comment" onClick={() => toggleComments(post.id)}>
                        <FaRegComment />
                      </button>
                      <button className="icon-btn" title={starredPosts[post.id] ? 'Unstar' : 'Star'} onClick={() => starredPosts[post.id] ? handleUnstar(post.id) : handleStar(post.id)}>
                        {starredPosts[post.id] ? <FaStar style={{color:'#f5c518'}} /> : <FaRegStar />}
                      </button>
                    </div>
                    <button className="mt-1 mr-1" onClick={() => handleEdit(post)}>Edit</button>
                    <button className="mt-1" onClick={() => handleDelete(post.id)}>Delete</button>
                  </>
                )}
                {showComments[post.id] && <Comments postId={post.id} />}
              </div>
            </li>
          ))}
        </ul>
      </div>
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
    <div className="container">
      <div className="profile-card flex gap-2">
        <div className="user-header">
          <span className="avatar" title={profile?.displayName || username}>{getInitials(profile?.displayName || username)}</span>
          <span className="user-name">@{username}</span>
        </div>
        <div style={{flex:1}}>
          <h2>User Profile</h2>
          {loading && <div>Loading...</div>}
          {error && <div className="text-danger mb-1">{error}</div>}
          {profile && (
            <div>
              <div><b>Display Name:</b> {profile.displayName}</div>
              <div><b>Bio:</b> {profile.bio}</div>
              <div><b>Location:</b> {profile.location}</div>
              <div className="mt-2">
                {isFollowing ? (
                  <button onClick={handleUnfollow} disabled={followLoading} className="mr-1">
                    Unfollow
                  </button>
                ) : (
                  <button onClick={handleFollow} disabled={followLoading} className="mr-1">
                    Follow
                  </button>
                )}
                {followError && <div className="text-danger mt-1">{followError}</div>}
              </div>
            </div>
          )}
        </div>
      </div>
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
    <div className="profile-card">
      <h2>My Followers</h2>
      {loading && <div>Loading...</div>}
      {error && <div className="text-danger mb-1">{error}</div>}
      {followers.length === 0 && !loading && <div>You have no followers yet.</div>}
      <ul>
        {followers.map((user, idx) => (
          <li key={idx} className="flex gap-2 mb-1 card">
            <div className="user-header">
              <span className="avatar" title={user.displayName}>{getInitials(user.displayName)}</span>
              <span className="user-name">@{user.username}</span>
            </div>
            <div>
              <div><b>{user.displayName}</b></div>
              <div>{user.bio}</div>
              <div>{user.location}</div>
            </div>
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
    <div className="profile-card">
      <h3>Following</h3>
      {loading && <div>Loading...</div>}
      {error && <div className="text-danger mb-1">{error}</div>}
      {following.length === 0 && !loading && !error && <div>You are not following anyone yet.</div>}
      <ul>
        {following.map((user, idx) => (
          <li key={idx} className="flex gap-2 mb-1 card">
            <div className="user-header">
              <span className="avatar" title={user.displayName}>{getInitials(user.displayName)}</span>
              <span className="user-name">@{user.username}</span>
            </div>
            <div>
              <div><b>{user.displayName}</b></div>
              <div>{user.bio}</div>
              <div>{user.location}</div>
            </div>
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
  const [showComments, setShowComments] = useState({});
  const toggleComments = useCallback((postId) => {
    setShowComments(prev => ({ ...prev, [postId]: !prev[postId] }));
  }, []);

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

  // Starred state for StarredPosts
  const [starredPosts, setStarredPosts] = useState({});
  useEffect(() => {
    async function fetchStarred() {
      try {
        const res = await api.get('/user/starred');
        const map = {};
        res.data.forEach(post => { map[post.id] = true; });
        setStarredPosts(map);
      } catch {
        setStarredPosts({});
      }
    }
    fetchStarred();
  }, [posts]);
  const handleStar = async (postId) => {
    try {
      await api.post(`/user/star/${postId}`);
      setStarredPosts(prev => ({ ...prev, [postId]: true }));
    } catch {}
  };
  const handleUnstar = async (postId) => {
    try {
      await api.delete(`/user/unstar/${postId}`);
      setStarredPosts(prev => ({ ...prev, [postId]: false }));
    } catch {}
  };

  return (
    <div className="container">
      <div className="main-feed">
        <h2>Starred Posts</h2>
        {loading && <div>Loading...</div>}
        {error && <div className="text-danger mb-1">{error}</div>}
        {posts.length === 0 && !loading && <div>You have not starred any posts yet.</div>}
        <ul>
          {posts.map(post => (
            <li key={post.id} className="card" style={{padding:'2rem 2rem 1.2rem 2rem', marginBottom:'2.5rem'}}>
              <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'0.7rem'}}>
                <div style={{display:'flex', alignItems:'center', gap:'1rem'}}>
                  <span className="avatar" title={post.username}>{getInitials(post.username)}</span>
                  <div>
                    <span className="display-name">{post.username}</span>
                    <span className="username">@{post.username}</span>
                    <span className="timestamp">· 2h</span>
                  </div>
                </div>
              </div>
              <div className="mb-2" style={{fontSize:'1.13em', lineHeight:'1.6', marginLeft:'3.2rem'}}>{post.content}</div>
              <div className="action-bar">
                <button className="icon-btn" title={starredPosts[post.id] ? 'Unstar' : 'Star'} onClick={() => starredPosts[post.id] ? handleUnstar(post.id) : handleStar(post.id)}>
                  {starredPosts[post.id] ? <FaStar style={{color:'#f5c518'}} /> : <FaRegStar />}
                </button>
              </div>
              {showComments[post.id] && <Comments postId={post.id} />}
            </li>
          ))}
        </ul>
      </div>
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
