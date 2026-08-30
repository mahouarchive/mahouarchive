const SUPABASE_URL = "https://evbqkoyqgixyvkgcfzpu.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2YnFrb3lxZ2l4eXZrZ2NmenB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MTY5NjQsImV4cCI6MjA5NjM5Mjk2NH0.anZeFQ-32U3c3h0fWlAbbIfzGM2F2--P4ndQMM5aGN4";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
let userFingerprint = "";

// Secret password for your Admin account
const ADMIN_SECRET_PASSWORD = "mahoumahou";

const AVATAR_LIST = [
  "https://uploadkon.ir/uploads/b32822_26b317675519ef05c3156a9c0afaf62749.jpg",
  "https://uploadkon.ir/uploads/8ff122_261c60c0ca2cfc6de159c285ec9d7b8539.jpg",
  "https://uploadkon.ir/uploads/e15c22_26ezgif-475add1d1d0b2d58.jpg",
  "https://uploadkon.ir/uploads/66be22_260aa0cb5efdc49770c6ca3fe3f19c4ef3.jpg"
];

let selectedPfp = AVATAR_LIST[0];

function getSavedUser() {
  const data = localStorage.getItem('mahou_user_session');
  return data ? JSON.parse(data) : null;
}

function renderAuthPanel(postId) {
  const panel = document.getElementById(`auth-panel-${postId}`);
  if (!panel) return;
  const user = getSavedUser();

  if (user) {
    panel.innerHTML = `
      <div class="logged-user-bar">
        <div class="user-badge">
          <img src="${user.pfp}" alt="Avatar">
          <span><strong>${user.username}</strong></span>
        </div>
        <button onclick="logoutUser('${postId}')" style="background:#ff2e63; color:#fff; border:none; padding:4px 10px; cursor:pointer; border-radius:4px;">خروج / Logout</button>
      </div>
    `;
  } else {
    panel.innerHTML = `
      <div class="auth-form">
        <strong style="font-size:0.88rem;"><i class="fas fa-user-plus"></i> ایجاد حساب کاربری / Account Setup:</strong>
        <input type="text" id="reg-username-${postId}" placeholder="نام کاربری / Username" required style="width:100%; box-sizing:border-box; margin-top:5px; padding:6px;">
        <input type="password" id="reg-password-${postId}" placeholder="رمز عبور / Password" required style="width:100%; box-sizing:border-box; margin-top:5px; padding:6px;">
        <input type="text" id="reg-custom-pfp-${postId}" placeholder="آدرس تصویر پروفایل (اختیاری) / Custom Avatar URL" style="width:100%; box-sizing:border-box; margin-top:5px; padding:6px;">
        <div style="font-size:0.78rem; color:#5a5666; margin-top:6px;">یا انتخاب از تصاویر پیش‌فرض:</div>
        <div class="pfp-selector">
          ${AVATAR_LIST.map((url, idx) => `<img src="${url}" class="pfp-option ${idx === 0 ? 'selected' : ''}" onclick="selectPfp(this, '${url}')">`).join('')}
        </div>
        <div class="auth-btn-group" style="margin-top:8px;">
          <button onclick="registerAccount('${postId}')" style="width:100%; padding:8px; background:#ff2e63; color:#fff; border:none; border-radius:4px; cursor:pointer;">ثبت نام / Save Profile</button>
        </div>
      </div>
    `;
  }
}

function selectPfp(imgEl, url) {
  document.querySelectorAll('.pfp-option').forEach(el => el.classList.remove('selected'));
  imgEl.classList.add('selected');
  selectedPfp = url;
}

function registerAccount(postId) {
  const userInp = document.getElementById(`reg-username-${postId}`).value.trim();
  const passInp = document.getElementById(`reg-password-${postId}`).value.trim();
  const customPfp = document.getElementById(`reg-custom-pfp-${postId}`).value.trim();

  if (!userInp || !passInp) {
    alert("لطفا نام کاربری و رمز عبور را وارد کنید.");
    return;
  }

  if (userInp.toLowerCase() === 'allssey') {
    if (passInp !== ADMIN_SECRET_PASSWORD) {
      alert("رمز عبور مدیر نادرست است! / Invalid Admin Password!");
      return;
    }
  }

  const pfp = customPfp || selectedPfp;
  const userData = { username: userInp, password: passInp, pfp: pfp };
  localStorage.setItem('mahou_user_session', JSON.stringify(userData));

  document.querySelectorAll('.cmt-account-wrapper').forEach(el => {
    const pId = el.id.replace('auth-panel-', '');
    renderAuthPanel(pId);
    loadPostComments(pId);
  });
}

function logoutUser(postId) {
  localStorage.removeItem('mahou_user_session');
  document.querySelectorAll('.cmt-account-wrapper').forEach(el => {
    const pId = el.id.replace('auth-panel-', '');
    renderAuthPanel(pId);
    loadPostComments(pId);
  });
}

function updateCommentCountUI(postId, count) {
  const countElements = document.querySelectorAll(`[data-postid="${postId}"].comment-redirect-link .cmt-count-num`);
  countElements.forEach(el => {
    el.innerText = count;
  });
}

async function loadPostComments(postId) {
  const listContainer = document.getElementById(`comments-list-${postId}`);
  if (!listContainer) return;

  const currentUser = getSavedUser();
  const isAdmin = currentUser && 
                  currentUser.username.toLowerCase() === 'allssey' && 
                  currentUser.password === ADMIN_SECRET_PASSWORD;

  let { data: comments, error } = await supabaseClient
    .from('blog_comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (error || !comments) {
    listContainer.innerHTML = '<p style="font-size:0.85rem; color:#888;">هیچ نظری هنوز ثبت نشده است.</p>';
    updateCommentCountUI(postId, 0);
    return;
  }

  updateCommentCountUI(postId, comments.length);

  if (comments.length === 0) {
    listContainer.innerHTML = '<p style="font-size:0.85rem; color:#888;">هیچ نظری هنوز ثبت نشده است.</p>';
    return;
  }

  const parentComments = comments.filter(c => !c.parent_id);
  const repliesMap = {};

  comments.filter(c => c.parent_id).forEach(reply => {
    if (!repliesMap[reply.parent_id]) repliesMap[reply.parent_id] = [];
    repliesMap[reply.parent_id].push(reply);
  });

  function renderSingleComment(c, isReply = false) {
    const isCommentByAdmin = c.username && c.username.toLowerCase() === 'allssey';
    const childReplies = repliesMap[c.id] || [];

    return `
      <div class="comment-card ${isReply ? 'comment-reply' : ''}" id="comment-${c.id}">
        <img src="${c.avatar || AVATAR_LIST[0]}" class="comment-card-avatar">
        <div class="comment-card-main">
          <div class="comment-header">
            <div>
              <strong>${c.username || 'ناشناس'}</strong>
              ${isCommentByAdmin ? '<span style="background:#ff2e63; color:#fff; font-size:10px; padding:1px 6px; margin-right:4px; font-weight:bold; border-radius:3px;">[ADMIN]</span>' : ''}
            </div>
            <div class="comment-header-actions">
              <span style="opacity:0.75;">${new Date(c.created_at).toLocaleDateString('fa-IR')}</span>
              <button onclick="toggleReplyForm('${c.id}')" style="background:none; border:none; color:#ff2e63; cursor:pointer; font-size:0.8rem;" title="پاسخ"><i class="fas fa-reply"></i> پاسخ</button>
              ${isAdmin ? `<button onclick="deleteComment('${c.id}', '${postId}')" style="background:none; border:none; color:#ff2e63; cursor:pointer;" title="حذف نظر"><i class="fas fa-trash"></i></button>` : ''}
            </div>
          </div>
          <div class="comment-body">${c.content}</div>

          <!-- Inline Reply Box -->
          <div id="reply-box-${c.id}" class="reply-form-box" style="display:none; margin-top:8px;">
            <textarea id="reply-text-${c.id}" placeholder="پاسخ خود را بنویسید... / Write a reply..." style="width:100%; min-height:55px; font-size:0.85rem; padding:6px; border-radius:4px; border:1px solid #ccc;"></textarea>
            <div style="margin-top:4px; display:flex; gap:6px;">
              <button onclick="handleSendComment('${postId}', '${c.id}')" style="background:#ff2e63; color:#fff; border:none; padding:5px 12px; font-size:0.8rem; border-radius:3px; cursor:pointer;">ارسال پاسخ</button>
              <button onclick="toggleReplyForm('${c.id}')" style="background:#666; color:#fff; border:none; padding:5px 12px; font-size:0.8rem; border-radius:3px; cursor:pointer;">انصراف</button>
            </div>
          </div>

          <!-- Render Child Replies -->
          ${childReplies.length > 0 ? childReplies.map(r => renderSingleComment(r, true)).join('') : ''}
        </div>
      </div>
    `;
  }

  listContainer.innerHTML = parentComments.map(c => renderSingleComment(c)).join('');
}

function toggleReplyForm(commentId) {
  const box = document.getElementById(`reply-box-${commentId}`);
  if (box) {
    box.style.display = box.style.display === 'none' ? 'block' : 'none';
  }
}

async function handleSendComment(postId, parentId = null) {
  const user = getSavedUser();
  let textInput = parentId ? document.getElementById(`reply-text-${parentId}`) : document.getElementById(`comment-text-${postId}`);
  const content = textInput ? textInput.value.trim() : '';

  if (!content) {
    alert("لطفا متن نظر خود را وارد کنید / Please enter your comment.");
    return;
  }

  const username = user ? user.username : "ناشناس";
  const avatar = user ? user.pfp : AVATAR_LIST[0];

  const commentData = {
    post_id: postId,
    username: username,
    avatar: avatar,
    content: content
  };

  if (parentId) commentData.parent_id = parentId;

  const { error } = await supabaseClient
    .from('blog_comments')
    .insert([commentData]);

  if (error) {
    alert("خطا در ثبت نظر / Error posting comment");
    console.error("Supabase send error:", error);
  } else {
    if (textInput) textInput.value = '';
    loadPostComments(postId);
  }
}

async function deleteComment(commentId, postId) {
  if (!confirm("آیا از حذف این نظر مطمئن هستید؟ / Delete this comment?")) return;

  const { error } = await supabaseClient
    .from('blog_comments')
    .delete()
    .eq('id', commentId);

  if (error) {
    alert("خطا در حذف نظر / Error deleting comment");
    console.error(error);
  } else {
    loadPostComments(postId);
  }
}

// Playlists & Player Setup
const playlists = [
  {
    folderName: "Madoka Magica OST",
    songs: [
      {
        name: "sis puella magica!",
        url: "https://uploadkon.ir/uploads/1fd629_2614-Sis-Puella-Magica-Yuki-Kajiura-320-.mp3",
        cover: "https://uploadkon.ir/uploads/fa3e29_26IMG-20260529-231618.jpg"
      },
      {
        name: "Dectrum",
        url: "https://uploadkon.ir/uploads/312d29_2612-Decretum-Sayaka-Miki-s-Them-Madoka-Magica【まどか★マギカ】-PianoBox.mp3",
        cover: "https://uploadkon.ir/uploads/b4f529_26IMG-20260529-231602.jpg"
      },
      {
        name: "Magia Quattro",
        url: "https://uploadkon.ir/uploads/b38330_26Kalafina-Magia-quattro-128.mp3",
        cover: "https://uploadkon.ir/uploads/ea1130_26artworks-000034010291-41yfh5-t500x500.jpg"
      }
    ]
  }, 
  {
    folderName: "All Ado",
    songs: [
      {
        name: "Kura Kura",
        url: "https://uploadkon.ir/uploads/fb4630_26Ado-クラクラ-128.mp3",
        cover: "https://uploadkon.ir/uploads/203530_26IMG-20260530-165511.jpg"
       },
      { 
        name: "Ashite Ashite",
        url: "https://uploadkon.ir/uploads/eb8c24_26Ado-Aishite-Aishite-Aishite-000035.mp3",
        cover: "https://uploadkon.ir/uploads/6b9724_261ca44dc5eac6d36f42e0e05fd4fa1b63.jpg"
       },
      { 
        name:  "Readymade",
        url: "https://uploadkon.ir/uploads/926d24_26Ado-Readymade-000012.mp3",
        cover: "https://uploadkon.ir/uploads/ff9f24_2628a32cbc5884bbb69739f1f073c541bb-1000x1000x1.png"
       },
      {
        name: "God-ish",
        url: "https://uploadkon.ir/uploads/d4d624_26Ado-God-ish-000046.mp3",
        cover: "https://uploadkon.ir/uploads/25ab24_26634ac404c5a9b92c40416a83906fa4f9-1000x1000x1.png"
       },
      {
        name: "Chocolat Cadabra",
        url: "https://uploadkon.ir/uploads/212930_26Ado-ショコラカタブラ-128.mp3",
        cover: "https://uploadkon.ir/uploads/01bf30_26images-9-.jpeg"
      },
      {
        name: "MIRROR",
        url: "https://uploadkon.ir/uploads/363c30_26Ado-MIRROR-128.mp3",
        cover: "https://uploadkon.ir/uploads/c1b530_26images-10-.jpeg"
      },
      {
        name: "RuLe",
        url: "https://uploadkon.ir/uploads/ecf730_26Ado-Rule-128.mp3",
        cover: "https://uploadkon.ir/uploads/e13f30_26IMG-20260530-165538.jpg"
      },
      {
        name: "BACKLIGHT",
        url: "https://uploadkon.ir/uploads/ecf730_26Ado-逆光-ウタ-from-ONE-PIECE-FILM-RED-128.mp3",
        cover: "https://uploadkon.ir/uploads/203530_26IMG-20260530-165511.jpg"
      },
      {
        name: "I'm A Controversy",
        url: "https://uploadkon.ir/uploads/eaa130_26Im-a-controversy-Ado.mp3",
        cover: "https://uploadkon.ir/uploads/7f5430_26images-11-.jpeg"
      }
    ]
  }, 
  {
    folderName: "Fav late nighters",
    songs: [
      {
        name: "Salt-Wound routine",
        url: "https://uploadkon.ir/uploads/dc8024_26saltwound-routine-11vein.mp3",
        cover: "https://uploadkon.ir/uploads/519024_261782114380677.jpg"
      }
    ]
  }
];
let currentFolderIdx = null;
let currentSongIdx = null;

async function initUserFingerprint() {
  try {
    let localSpecs = window.screen.width + "x" + window.screen.height + navigator.language + navigator.userAgent.substring(0, 20);
    userFingerprint = btoa(localSpecs).replace(/[^a-zA-Z0-9]/g, "").substring(0, 15);
  } catch (err) {
    userFingerprint = localStorage.getItem('blog_fallback_uid') || 'uid_' + Math.random().toString(36).substring(2, 11);
    localStorage.setItem('blog_fallback_uid', userFingerprint);
  }
}

function slugify(str) {
  return str
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}

const playlistWrapper = document.getElementById('playlist-container');
if (playlistWrapper && playlists && playlists.length > 0) {
  playlists.forEach((folder, fIdx) => {
    const fDiv = document.createElement('div');
    fDiv.className = 'playlist-folder';

    fDiv.innerHTML = `
      <div class="folder-header" onclick="toggleFolder(${fIdx})">
        <div class="folder-title">
          <i class="fas fa-folder"></i> 
          <span>${folder.folderName}</span>
        </div>
        <div class="folder-chevron"><i class="fas fa-chevron-down"></i></div>
      </div>
      <div class="folder-songs" id="folder-${fIdx}">
        <div class="folder-songs-inner"></div>
      </div>
    `;
    
    const inner = fDiv.querySelector('.folder-songs-inner');
    folder.songs.forEach((song, sIdx) => {
      const sDiv = document.createElement('div');
      sDiv.className = 'song';
      sDiv.id = `song-${fIdx}-${sIdx}`;
      const songId = slugify(`${folder.folderName}-${song.name}`);
      sDiv.setAttribute('data-songid', songId);
      sDiv.onclick = (e) => { 
        e.stopPropagation(); 
        playTrack(fIdx, sIdx); 
      };
      
      sDiv.innerHTML = `
        <img src="${song.cover || 'https://uploadkon.ir/uploads/06a730_26InShot-20260530-094627246.gif'}" loading="lazy">
        <span>${song.name}</span>
        <button class="song-like-btn" data-songid="${songId}" onclick="event.stopPropagation(); handleSongLike('${songId}')">
          <i class="far fa-heart song-heart-icon"></i> <span class="song-like-num">0</span>
        </button>
        <div class="wave"><span></span><span></span><span></span></div>
      `;
      inner.appendChild(sDiv);
    });
    
    playlistWrapper.appendChild(fDiv);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  await initUserFingerprint();
  const currentUrl = window.location.href.toLowerCase();
  const isExtendedPostView = (currentUrl.indexOf('/post/') > -1 || currentUrl.indexOf('post=') > -1);
  const statBars = document.querySelectorAll(".post-stats-bar");
  
  for (const bar of statBars) {
    const postId = bar.getAttribute("data-postid");
    if (!postId) continue;
    
    const viewNumEl = bar.querySelector(".view-num");
    const likeNumEl = bar.querySelector(".like-num");
    const likeBtn = bar.querySelector(".fire-like-btn");
    
    let { data: post } = await supabaseClient
      .from('blog_posts')
      .select('*')
      .eq('post_id', postId)
      .maybeSingle();
      
    const hasViewedThisSession = sessionStorage.getItem(`viewed_session_${postId}`);
    
    if (!post) {
      const { data: newPost } = await supabaseClient
        .from('blog_posts')
        .insert([{ post_id: postId, views: 1, likes: 0, liked_by: [] }])
        .select()
        .single();
      post = newPost;
      sessionStorage.setItem(`viewed_session_${postId}`, "true");
    } else if (!hasViewedThisSession) {
      const { data: updatedPost } = await supabaseClient
        .from('blog_posts')
        .update({ views: post.views + 1 })
        .eq('post_id', postId)
        .select()
        .single();
      post = updatedPost;
      sessionStorage.setItem(`viewed_session_${postId}`, "true");
    }
    
    if (post) {
      if (viewNumEl) viewNumEl.innerText = post.views;
      if (likeNumEl) likeNumEl.innerText = post.likes;
      if (post.liked_by && post.liked_by.includes(userFingerprint)) {
        likeBtn.classList.add("liked");
        likeBtn.querySelector(".heart-icon").className = "fas fa-heart heart-icon";
      }
    }
    
    loadPostComments(postId);

    const commentBoxSection = document.querySelector(`.comments-section[data-postid="${postId}"]`);
    if (commentBoxSection) {
      if (isExtendedPostView) {
        commentBoxSection.classList.add("show-explicit");
        renderAuthPanel(postId);
      }
    }
  }

  loadAllSongLikes();

  const player = document.getElementById('player');
  if (player) {
    player.addEventListener('ended', () => {
      if (currentFolderIdx !== null && currentSongIdx !== null) {
        let next = currentSongIdx + 1;
        if (next >= playlists[currentFolderIdx].songs.length) next = 0;
        playTrack(currentFolderIdx, next);
      }
    });
  }
});

async function handleFireLike(postId) {
  const bar = document.querySelector(`.post-stats-bar[data-postid="${postId}"]`);
  if (!bar) return;
  
  const likeBtn = bar.querySelector(".fire-like-btn");
  const likeNumEl = bar.querySelector(".like-num");
  const heartIcon = likeBtn.querySelector(".heart-icon");
  
  let { data: post } = await supabaseClient
    .from('blog_posts')
    .select('*')
    .eq('post_id', postId)
    .maybeSingle();
    
  if (!post) return;
  
  let likedBy = post.liked_by || [];
  let currentLikes = post.likes || 0;
  const hasLiked = likedBy.includes(userFingerprint);
  
  if (hasLiked) {
    likedBy = likedBy.filter(id => id !== userFingerprint);
    currentLikes = Math.max(0, currentLikes - 1);
    likeBtn.classList.remove("liked");
    heartIcon.className = "far fa-heart heart-icon";
  } else {
    likedBy.push(userFingerprint);
    currentLikes += 1;
    likeBtn.classList.add("liked");
    heartIcon.className = "fas fa-heart heart-icon";
  }
  
  const { data: updatedPost, error } = await supabaseClient
    .from('blog_posts')
    .update({ likes: currentLikes, liked_by: likedBy })
    .eq('post_id', postId)
    .select()
    .single();
    
  if (error) {
    console.error("Error updating likes:", error);
    return;
  }
  
  if (updatedPost && likeNumEl) {
    likeNumEl.innerText = updatedPost.likes;
  }
}

async function loadAllSongLikes() {
  const songEls = document.querySelectorAll(".song[data-songid]");
  if (songEls.length === 0) return;

  const { data: rows, error } = await supabaseClient
    .from('song_likes')
    .select('*');

  if (error) {
    console.error("Error loading song likes:", error);
    return;
  }

  const rowMap = {};
  (rows || []).forEach(r => { rowMap[r.song_id] = r; });

  songEls.forEach(el => {
    const songId = el.getAttribute('data-songid');
    const btn = el.querySelector('.song-like-btn');
    const numEl = el.querySelector('.song-like-num');
    const heartIcon = el.querySelector('.song-heart-icon');
    const row = rowMap[songId];

    if (row) {
      if (numEl) numEl.innerText = row.likes || 0;
      if (row.liked_by && row.liked_by.includes(userFingerprint)) {
        btn.classList.add("liked");
        heartIcon.className = "fas fa-heart song-heart-icon";
      }
    }
  });
}

async function handleSongLike(songId) {
  const btn = document.querySelector(`.song-like-btn[data-songid="${songId}"]`);
  if (!btn) return;

  const numEl = btn.querySelector(".song-like-num");
  const heartIcon = btn.querySelector(".song-heart-icon");

  let { data: row } = await supabaseClient
    .from('song_likes')
    .select('*')
    .eq('song_id', songId)
    .maybeSingle();

  if (!row) {
    const { data: newRow, error } = await supabaseClient
      .from('song_likes')
      .insert([{ song_id: songId, likes: 1, liked_by: [userFingerprint] }])
      .select()
      .single();

    if (error) {
      console.error("Error creating song_likes row:", error);
      return;
    }
    row = newRow;
    if (numEl) numEl.innerText = row.likes;
    btn.classList.add("liked");
    heartIcon.className = "fas fa-heart song-heart-icon";
    return;
  }

  let likedBy = row.liked_by || [];
  let currentLikes = row.likes || 0;
  const hasLiked = likedBy.includes(userFingerprint);

  if (hasLiked) {
    likedBy = likedBy.filter(id => id !== userFingerprint);
    currentLikes = Math.max(0, currentLikes - 1);
    btn.classList.remove("liked");
    heartIcon.className = "far fa-heart song-heart-icon";
  } else {
    likedBy.push(userFingerprint);
    currentLikes += 1;
    btn.classList.add("liked");
    heartIcon.className = "fas fa-heart song-heart-icon";
  }

  const { data: updatedRow, error } = await supabaseClient
    .from('song_likes')
    .update({ likes: currentLikes, liked_by: likedBy })
    .eq('song_id', songId)
    .select()
    .single();

  if (error) {
    console.error("Error updating song likes:", error);
    return;
  }

  if (updatedRow && numEl) {
    numEl.innerText = updatedRow.likes;
  }
}

function filterPostSearch() {
  const input = document.getElementById('post-search-input');
  const resultsBox = document.getElementById('search-results');
  const query = input.value.trim().toLowerCase();

  if (!query) {
    resultsBox.classList.remove('is-open');
    resultsBox.innerHTML = '';
    return;
  }

  const items = document.querySelectorAll('#search-index li');
  const matches = [];
  items.forEach(function(item) {
    const title = item.getAttribute('data-title') || '';
    if (title.toLowerCase().includes(query)) {
      matches.push({ title: title, link: item.getAttribute('data-link') });
    }
  });

  resultsBox.innerHTML = '';
  if (matches.length === 0) {
    const noMatch = document.createElement('div');
    noMatch.className = 'search-no-match';
    noMatch.innerText = 'مطلبی یافت نشد در ۳۰ پست اخیر / No match in recent posts.';
    resultsBox.appendChild(noMatch);
  } else {
    matches.slice(0, 10).forEach(function(m) {
      const a = document.createElement('a');
      a.href = m.link;
      a.innerText = m.title;
      resultsBox.appendChild(a);
    });
  }

  const moreLink = document.createElement('a');
  moreLink.className = 'search-more-link';
  moreLink.href = '#';
  moreLink.innerText = 'جستجو در کل آرشیو / Search entire archive »';
  moreLink.onclick = function(e) {
    e.preventDefault();
    goToFullArchiveSearch(query);
  };
  resultsBox.appendChild(moreLink);

  resultsBox.classList.add('is-open');
}

function goToFullArchiveSearch(query) {
  const q = encodeURIComponent(query);
  // Update this domain once your new site is live at its final address
  window.open('https://www.google.com/search?q=site:YOURUSERNAME.github.io+' + q, '_blank');
}

function runPostSearch(event) {
  event.preventDefault();
  const input = document.getElementById('post-search-input');
  const query = input.value.trim();
  if (!query) return false;
  goToFullArchiveSearch(query);
  return false;
}

function toggleFolder(idx) {
  const folders = document.querySelectorAll('.playlist-folder');
  folders.forEach((f, i) => {
    if(i === idx) {
      f.classList.toggle('is-open');
    } else {
      f.classList.remove('is-open');
    }
  });
}

function playTrack(fIdx, sIdx) {
  const player = document.getElementById('player');
  if (!player) return;

  document.querySelectorAll('.song').forEach(s => s.classList.remove('is-playing'));
  
  currentFolderIdx = fIdx; 
  currentSongIdx = sIdx;
  
  const song = playlists[fIdx].songs[sIdx];
  const songEl = document.getElementById(`song-${fIdx}-${sIdx}`);
  if(songEl) songEl.classList.add('is-playing');
  
  player.src = song.url;
  player.style.display = 'block';
  player.play().catch(err => console.log("Audio presentation blocked:", err));

  const miniPlayer = document.getElementById('sticky-mini-player');
  const miniCover = document.getElementById('mini-cover');
  const miniSongName = document.getElementById('mini-song-name');
  
  if(miniPlayer && miniCover && miniSongName) {
    miniCover.src = song.cover || 'https://uploadkon.ir/uploads/06a730_26InShot-20260530-094627246.gif';
    miniSongName.innerText = song.name;
    miniPlayer.classList.remove('mini-player-hidden');
    document.getElementById('mini-play-icon').className = "fas fa-pause";
  }
}

function toggleStickyPlay() {
  const player = document.getElementById('player');
  const playIcon = document.getElementById('mini-play-icon');
  if (!player || !playIcon) return;
  
  if (player.paused) {
    player.play();
    playIcon.className = "fas fa-pause";
  } else {
    player.pause();
    playIcon.className = "fas fa-play";
  }
}
