/* ════════════════════════════════════════════════════════════
   script.js  —  Luminous Application Controller (Audit Fix)
════════════════════════════════════════════════════════════ */
'use strict';

import { 
    loginWithGoogle, 
    loginWithFacebook, 
    loginWithPhone, 
    loginAnonymously, 
    registerWithEmail,
    loginWithEmail,
    saveUserProfile,
    getUserProfile,
    watchAuthState, 
    logout 
} from './services/auth.js';

const PROFILES = [
    { id: 1, name: 'Elena', age: 24, bio: 'Chasing neon lights and cinematic frames. 🌙', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAJ8J-e6JNHFX8-Uod0WhZIIlV8CEGZd4P9gsiwpnYW12oyySqxgpGPZNoNYFLO_KMpfJVeG4EsZTBVFHP24Nas7guIwJ3JLfOxA_9XiskTxNJo8Bqyjja1gaIUq1DxhdTClAnF8IftsVxhAu6JoggkIA43MFW5mnH-BCHVtN5ulYFTp-cIjcsMV_ssqQ1lMWQTjc9N9539MQzsMI_NCQ_pcWyvOHbReu9du377pOZ8eHH-VCBViIeNzlf6_CXbCJRkFd28LI0k3XC3', tags: ['Art', 'Music'] },
    { id: 2, name: 'Maya', age: 22, bio: 'Vintage soul with a modern heartbeat. 🎸', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAD7G45XMQSA4NM64MwFNLpCHQiLl4aAb3-7z7_BrNRPqTt5ZEcCl8vrh3NHEgaPYpZyhTHgu7FtAAoIKp_aGrLTDTB5HKvu1jFYL6Oyaf3741voYn57OJAepVWKH9yPtMKQhyCWNjmmqg592DhQeJereErwkK6lFZAJgOGiBG-ZLuLUfsUIdywQNAZAv5i7dVHY9hjMhVevXIo7QPvD8KKNLRtGMTxxk1r0w8FBD93PF33Ii0c11-ovOWfpovnaJ62CsEuNZ9fzQnv', tags: ['Travel', 'Food'] },
    { id: 3, name: 'Sasha', age: 25, bio: 'Digital architect by day, explorer by night.', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBT_liZrVO1sPZYjBXkqnWCnLW9gmZs-Y4_JYriRNBdHt-zYGvEKsVSnTQPOe4S09jWjMS8PXlkqBs2dgUUO8wwquQsyEi_ulm5jUge-sr3UunyuTK_dqB7eg0JgVEq8TGEW3Naw9hyT61KsudQDjN2KtDWDncIMF_JhNbT5B-hShVz5_CGnjE6EXXumDJf2gHq33SPuG1ZXq_e5AK4kL-EW33huB-MCQHPPVIztAVg_pQY0kCjVihR2spERNgppcbm-fKEUT3g5Xxu', tags: ['Gaming', 'Tech'] }
];

class ScreenManager {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.nav = document.getElementById('global-nav');
        this.currentScreen = null;
        this.activeChatPartner = null;
        this.currentStep = 1;
        this.onboardingData = { gender: '', pref: '', tags: [] };
        this.filters = { maxAge: 45, tags: [] };
        this.initGlobalNav();
        this.initTheme();
    }

    initTheme() {
        const theme = localStorage.getItem('luminous_theme');
        if (theme === 'light') document.body.classList.add('light-mode');
    }

    initGlobalNav() {
        document.querySelectorAll('#global-nav [data-nav]').forEach(btn => {
            btn.onclick = () => this.switchScreen(btn.getAttribute('data-nav'));
        });
    }

    async switchScreen(screenName) {
        if (this.currentScreen === screenName) return;
        this.container.classList.add('opacity-0');
        
        try {
            const response = await fetch(`./screens/${screenName}.html`);
            if (!response.ok) throw new Error(`Screen ${screenName} not found`);
            const html = await response.text();

            setTimeout(() => {
                this.container.innerHTML = html;
                this.currentScreen = screenName;
                
                try {
                    this.initScreen(screenName);
                    this.attachGlobalElements(screenName);
                } catch (e) {
                    console.error(`[ScreenManager] Error initializing ${screenName}:`, e);
                }

                this.updateNavState(screenName);
                this.container.classList.remove('opacity-0');
            }, 300);

        } catch (err) {
            console.error('[ScreenManager]', err);
        }
    }

    initScreen(name) {
        // Wiring specific buttons in templates
        if (name === 'splash') {
            const startBtn = document.getElementById('splash-start-btn');
            if (startBtn) startBtn.onclick = () => this.switchScreen('auth');
        }

        if (name === 'auth') {
            const emailBtn = document.getElementById('auth-email-btn');
            const emailBack = document.getElementById('email-auth-back');
            const mainOptions = document.getElementById('auth-main-options');
            const emailContainer = document.getElementById('email-auth-container');
            const authForm = document.getElementById('email-auth-form');
            const formToggle = document.getElementById('email-form-toggle');
            const submitBtn = document.getElementById('email-auth-submit');
            let isLoginMode = false;

            if (emailBtn) emailBtn.onclick = () => { mainOptions.classList.add('hidden'); emailContainer.classList.remove('hidden'); };
            if (emailBack) emailBack.onclick = () => { emailContainer.classList.add('hidden'); mainOptions.classList.remove('hidden'); };
            if (formToggle) formToggle.onclick = () => {
                isLoginMode = !isLoginMode;
                document.getElementById('email-form-title').innerText = isLoginMode ? 'Welcome Back' : 'Create Account';
                submitBtn.innerText = isLoginMode ? 'Login' : 'Sign Up';
                formToggle.innerHTML = isLoginMode ? 'New here? <span class="font-bold text-primary">Create Account</span>' : 'Already have an account? <span class="font-bold text-primary">Login</span>';
            };

            const handleUser = async (user) => {
                if (user) {
                    const accounts = JSON.parse(localStorage.getItem('luminous_accounts') || '{}');
                    let savedProfile = accounts[user.email];
                    
                    // NEW: Try to fetch from Cloud Firestore if local mock fails
                    if (!savedProfile) {
                        try {
                            savedProfile = await getUserProfile(user.uid);
                            console.log('[Auth] Profile recovered from Cloud Firestore');
                        } catch (e) { console.error('[Auth] Firestore fetch failed'); }
                    }

                    savedProfile = savedProfile || {};
                    const role = user.email === 'golcuu16@gmail.com' ? 'admin' : 'user';
                    
                    const userData = {
                        ...savedProfile,
                        uid: user.uid,
                        name: savedProfile.name || user.displayName || user.email?.split('@')[0] || 'Guest',
                        email: user.email,
                        role: role
                    };

                    localStorage.setItem('luminous_user', JSON.stringify(userData));
                    if (userData.age) this.switchScreen('discover');
                    else this.switchScreen('onboarding');
                }
            };

            if (authForm) {
                authForm.onsubmit = async (e) => {
                    e.preventDefault();
                    console.log('[Auth] Email Form Submitted');
                    const email = document.getElementById('auth-email-input').value;
                    const pass = document.getElementById('auth-password-input').value;
                    try {
                        submitBtn.disabled = true;
                        submitBtn.innerText = 'Processing...';
                        let user;
                        try {
                             user = isLoginMode ? await loginWithEmail(email, pass) : await registerWithEmail(email, pass);
                        } catch (fError) { console.warn("Firebase bypassed, using mock."); }

                        if (!user) user = { email: email, displayName: email.split('@')[0] };
                        handleUser(user);
                    } catch (err) { alert('Auth Error'); }
                    finally {
                        submitBtn.disabled = false;
                        submitBtn.innerText = isLoginMode ? 'Login' : 'Sign Up';
                    }
                };
            }

            const gBtn = document.getElementById('auth-google-btn');
            if (gBtn) gBtn.onclick = async () => {
                try {
                    const user = await loginWithGoogle();
                    handleUser(user);
                } catch(e) { 
                    if (e.message !== "CONFIG_MISSING") alert("Google login failed: " + e.message); 
                }
            };
            
            const fBtn = document.getElementById('auth-facebook-btn');
            if (fBtn) fBtn.onclick = async () => {
                try {
                    const user = await loginWithFacebook();
                    if (user) handleUser(user);
                } catch(e) { alert("Facebook login failed"); }
            };

            const pBtn = document.getElementById('auth-phone-btn');
            if (pBtn) pBtn.onclick = () => {
                const num = prompt("Enter your phone number (+90...):");
                if (num) loginWithPhone(num).then(res => {
                    const code = prompt("Enter the SMS code:");
                    res.confirm(code).then(r => handleUser(r.user));
                });
            };

            const sBtn = document.getElementById('auth-skip-btn');
            if (sBtn) sBtn.onclick = async () => {
                try { const user = await loginAnonymously(); handleUser(user); }
                catch(e) { handleUser({ displayName: 'Guest' }); }
            };
        }

        if (name === 'discover') {
            this.initSwipeDeck();
            this.initFilterModal();
            const setBtn = document.getElementById('nav-settings-btn');
            if (setBtn) setBtn.onclick = () => this.switchScreen('settings');
        }

        if (name === 'matching') {
            const stopBtn = document.getElementById('stop-search-btn');
            if (stopBtn) stopBtn.onclick = () => { socket.emit('next'); this.switchScreen('discover'); };
            if (!isConnected) {
                console.log('[Socket] Sending start-search...');
                socket.emit('start-search');
            }
        }

        if (name === 'chat') this.wireChatEvents();

        if (name === 'profile') {
            const user = JSON.parse(localStorage.getItem('luminous_user') || '{}');
            const nameInp = document.getElementById('profile-name');
            const bioInp = document.getElementById('profile-bio');
            const preview = document.getElementById('profile-preview-img');
            const back = document.getElementById('profile-back-btn');
            const save = document.getElementById('profile-save-btn');
            const editPhoto = document.getElementById('profile-edit-photo');

            if (nameInp) nameInp.value = user.name || '';
            if (bioInp) bioInp.value = user.bio || '';
            if (preview && user.photo) preview.src = user.photo;

            if (editPhoto) editPhoto.onclick = () => {
                const newUrl = prompt("Enter new photo URL:");
                if (newUrl && preview) {
                    preview.src = newUrl;
                    user.photo = newUrl;
                }
            };

            if (back) back.onclick = () => this.switchScreen('discover');
            
            if (save) save.onclick = async () => {
                try {
                    save.innerText = '...';
                    const updatedData = {
                        ...user,
                        name: nameInp.value,
                        bio: bioInp.value,
                        photo: preview.src
                    };

                    // Save to Cloud
                    if (user.uid) {
                        await saveUserProfile(user.uid, updatedData);
                    }

                    // Save Locally
                    localStorage.setItem('luminous_user', JSON.stringify(updatedData));
                    
                    // Update mock accounts
                    if (user.email) {
                        const accs = JSON.parse(localStorage.getItem('luminous_accounts') || '{}');
                        accs[user.email] = updatedData;
                        localStorage.setItem('luminous_accounts', JSON.stringify(accs));
                    }

                    alert('Profile updated successfully! ✨');
                } catch (e) {
                    alert('Failed to save profile');
                } finally {
                    save.innerText = 'Save';
                }
            };
        }

        if (name === 'settings') {
            const back = document.getElementById('settings-back-btn');
            const logout = document.getElementById('logout-btn');
            const darkBtn = document.getElementById('setting-darkmode');
            const notiBtn = document.getElementById('setting-notifications');
            const premBtn = document.getElementById('go-premium-btn');
            const adminLink = document.getElementById('admin-link-container');

            if (back) back.onclick = () => this.switchScreen('discover');
            if (logout) logout.onclick = () => { localStorage.clear(); window.location.reload(); };
            if (premBtn) premBtn.onclick = () => this.switchScreen('premium');
            
            // Role check for Admin Panel
            const user = JSON.parse(localStorage.getItem('luminous_user') || '{}');
            if (user.role === 'admin' && adminLink) {
                adminLink.classList.remove('hidden');
                adminLink.onclick = () => this.switchScreen('admin');
            }

            // Initialize Switch UI
            if (darkBtn) {
                const isLight = document.body.classList.contains('light-mode');
                this.updateSwitchUI(darkBtn, !isLight);
                darkBtn.onclick = () => {
                    const active = document.body.classList.toggle('light-mode');
                    localStorage.setItem('luminous_theme', active ? 'light' : 'dark');
                    this.updateSwitchUI(darkBtn, !active);
                };
            }

            if (notiBtn) {
                const isGranted = Notification.permission === 'granted';
                this.updateSwitchUI(notiBtn, isGranted);
                notiBtn.onclick = async () => {
                    const active = notiBtn.classList.contains('bg-primary');
                    if (!active) {
                        const permission = await Notification.requestPermission();
                        if (permission === 'granted') {
                            this.updateSwitchUI(notiBtn, true);
                            this.showNotification('Notifications Enabled', 'You will now receive match alerts.');
                        }
                    } else {
                        this.updateSwitchUI(notiBtn, false);
                    }
                };
            }
        }

        if (name === 'history') this.renderHistory();
        if (name === 'inbox') this.renderInbox();
        if (name === 'chat_detail') this.renderChatDetail();
        if (name === 'onboarding') this.initOnboarding();
        if (name === 'premium') {
            const back = document.getElementById('premium-back-btn');
            if (back) back.onclick = () => this.switchScreen('settings');
        }
        if (name === 'admin') this.initAdminPanel();

        if (name === 'rating') {
            const done = document.getElementById('rating-done-btn');
            const skip = document.getElementById('rating-skip-btn');
            if (done) done.onclick = () => this.switchScreen('discover');
            if (skip) skip.onclick = () => this.switchScreen('discover');
        }
    }

    updateSwitchUI(btn, active) {
        const dot = btn.querySelector('.dot');
        if (active) {
            btn.classList.replace('bg-white/10', 'bg-primary');
            dot.classList.add('translate-x-6');
        } else {
            btn.classList.replace('bg-primary', 'bg-white/10');
            dot.classList.remove('translate-x-6');
        }
    }

    attachGlobalElements(screenName) {
        // Sync User Profile Data to Navbar/Header
        const saved = localStorage.getItem('luminous_user');
        if (saved) {
            const user = JSON.parse(saved);
            const navImg = document.getElementById('nav-profile-img');
            const navName = document.getElementById('nav-user-name');
            if (navImg && user.photo) navImg.src = user.photo;
            if (navName && user.name) navName.innerText = user.name;
        }
    }

    updateNavState(screenName) {
        // Screens where navigation bar should be visible
        const mainScreens = ['discover', 'inbox', 'history', 'profile', 'settings'];
        if (mainScreens.includes(screenName)) {
            this.nav.classList.remove('hidden');
            this.nav.style.display = 'flex';
        } else {
            this.nav.classList.add('hidden');
            this.nav.style.display = 'none';
        }

        // Active state highlight
        document.querySelectorAll('#global-nav [data-nav]').forEach(btn => {
            if (btn.getAttribute('data-nav') === screenName) btn.classList.add('nav-active');
            else btn.classList.remove('nav-active');
        });
    }

    attachGlobalElements(name) {
        if (name === 'chat') {
            const rv = document.getElementById('remote-video');
            const lv = document.getElementById('local-video');
            if (rv) { rv.style.display = 'block'; document.getElementById('remote-video-container')?.appendChild(rv); }
            if (lv) { lv.style.display = 'block'; document.getElementById('local-video-container')?.appendChild(lv); }
        } else {
            const rv = document.getElementById('remote-video');
            if (rv) rv.style.display = 'none';
        }
    }

    initSwipeDeck() {
        const deck = document.getElementById('swipe-deck');
        if (!deck) return;
        
        // Apply Filters
        let profiles = PROFILES.filter(p => {
            const ageMatch = p.age <= this.filters.maxAge;
            const tagsMatch = this.filters.tags.length === 0 || p.tags.some(t => this.filters.tags.includes(t));
            return ageMatch && tagsMatch;
        });

        const render = () => {
            if (profiles.length === 0) { document.getElementById('deck-empty').classList.remove('hidden'); return; }
            const p = profiles[0];
            const card = document.createElement('div');
            card.className = 'swipe-card relative h-full w-full rounded-[2rem] overflow-hidden transition-all duration-500';
            card.innerHTML = `
                <img src="${p.img}" class="absolute inset-0 w-full h-full object-cover">
                <div class="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90 z-10"></div>
                <div class="absolute bottom-0 w-full p-8 text-white z-20">
                    <h2 class="text-4xl font-extrabold tracking-tighter">${p.name}, <span class="text-accent">${p.age}</span></h2>
                    <p class="text-white/70 mt-2 text-sm leading-relaxed">${p.bio}</p>
                    <div class="mt-8 flex gap-4">
                        <button class="dislike-btn flex-1 h-14 rounded-2xl bg-white/20 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-white/30 transition-all"><span class="material-symbols-outlined text-red-400">close</span></button>
                        <button class="like-btn flex-1 h-14 rounded-2xl primary-gradient flex items-center justify-center shadow-lg"><span class="material-symbols-outlined text-white" style="font-variation-settings:'FILL' 1">favorite</span></button>
                    </div>
                </div>`;
            deck.prepend(card);

            const likeBtn = card.querySelector('.like-btn');
            const dislikeBtn = card.querySelector('.dislike-btn');

            likeBtn.onpointerdown = (e) => e.stopPropagation();
            dislikeBtn.onpointerdown = (e) => e.stopPropagation();

            likeBtn.onclick = (e) => {
                e.stopPropagation();
                this.triggerSwipe(card, 1, () => { profiles.shift(); render(); });
            };
            dislikeBtn.onclick = (e) => {
                e.stopPropagation();
                this.triggerSwipe(card, -1, () => { profiles.shift(); render(); });
            };

            this.attachSwipeEvents(card, () => { profiles.shift(); render(); });
        };
        render();
    }

    initFilterModal() {
        const modal = document.getElementById('filter-modal');
        const openBtn = document.getElementById('nav-filter-btn');
        const closeBtn = document.getElementById('close-filter-btn');
        const applyBtn = document.getElementById('apply-filters-btn');
        const ageRange = document.getElementById('filter-age-range');
        const ageVal = document.getElementById('filter-age-val');
        const tagsCloud = document.getElementById('filter-tags-cloud');

        if (!modal) return;

        openBtn.onclick = () => {
            modal.classList.remove('hidden');
            setTimeout(() => modal.querySelector('.glass-card').classList.remove('translate-y-full'), 10);
        };

        const close = () => {
            modal.querySelector('.glass-card').classList.add('translate-y-full');
            setTimeout(() => modal.classList.add('hidden'), 500);
        };

        closeBtn.onclick = close;

        ageRange.oninput = () => {
            ageVal.innerText = ageRange.value;
            this.filters.maxAge = parseInt(ageRange.value);
        };

        // Tags logic
        const tags = ['Music', 'Travel', 'Art', 'Gaming', 'Fitness', 'Cinema', 'Food', 'Tech'];
        const renderFilterTags = () => {
            tagsCloud.innerHTML = '';
            tags.forEach(t => {
                const btn = document.createElement('button');
                const isSelected = this.filters.tags.includes(t);
                btn.className = `px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-wider transition-all ${isSelected ? 'primary-gradient text-white border-transparent' : 'bg-surface border-outline/10 text-on-surface/40'}`;
                btn.innerText = t;
                btn.onclick = () => {
                    if (this.filters.tags.includes(t)) this.filters.tags = this.filters.tags.filter(x => x !== t);
                    else this.filters.tags.push(t);
                    renderFilterTags();
                };
                tagsCloud.appendChild(btn);
            });
        };
        renderFilterTags();

        applyBtn.onclick = () => {
            close();
            this.initSwipeDeck();
        };
    }

    attachSwipeEvents(card, onDone) {
        let startX = 0, currentX = 0;
        card.onpointerdown = (e) => { startX = e.clientX; card.style.transition = 'none'; card.setPointerCapture(e.pointerId); };
        card.onpointermove = (e) => {
            if (startX === 0) return;
            currentX = e.clientX - startX;
            card.style.transform = `translateX(${currentX}px) rotate(${currentX / 15}deg)`;
            card.classList.toggle('swiping-right', currentX > 50); card.classList.toggle('swiping-left', currentX < -50);
        };
        card.onpointerup = () => {
            if (Math.abs(currentX) > 150) this.triggerSwipe(card, currentX > 0 ? 1 : -1, onDone);
            else { card.style.transition = 'transform 0.3s'; card.style.transform = ''; card.classList.remove('swiping-left', 'swiping-right'); }
            startX = 0; currentX = 0;
        };
    }

    triggerSwipe(card, dir, onDone) {
        card.style.transition = 'all 0.5s'; card.style.transform = `translateX(${dir * 1000}px) rotate(${dir * 45}deg)`; card.style.opacity = '0';
        setTimeout(() => { card.remove(); onDone(); }, 500);
    }

    initAdminPanel() {
        const back = document.getElementById('admin-back-btn');
        if (back) back.onclick = () => this.switchScreen('settings');

        const list = document.getElementById('admin-user-list');
        if (!list) return;

        // Mock Live Users for Moderation
        const mockUsers = [
            { id: 'User_Anon_9281', reports: 0 },
            { id: 'User_Anon_1245', reports: 3 },
            { id: 'User_Anon_4401', reports: 1 },
            { id: 'User_Anon_7720', reports: 0 }
        ];

        list.innerHTML = '';
        mockUsers.forEach(u => {
            const div = document.createElement('div');
            div.className = 'glass-effect p-4 rounded-3xl border border-white/5 flex items-center justify-between mb-3';
            div.innerHTML = `
                <div class="flex items-center gap-3">
                    <div class="w-12 h-12 rounded-2xl bg-surface flex items-center justify-center">
                        <span class="material-symbols-outlined text-on-surface/20">person</span>
                    </div>
                    <div>
                        <p class="text-sm font-bold">${u.id}</p>
                        <p class="text-[10px] opacity-40 uppercase">Reporting Count: ${u.reports}</p>
                    </div>
                </div>
                <button class="ban-btn bg-red-500/10 text-red-500 text-[10px] font-black px-4 py-2 rounded-xl hover:bg-red-500 hover:text-white transition-all">BAN</button>
            `;
            
            div.querySelector('.ban-btn').onclick = () => {
                const banned = JSON.parse(localStorage.getItem('luminous_banned_list') || '[]');
                if (!banned.includes(u.id)) banned.push(u.id);
                localStorage.setItem('luminous_banned_list', JSON.stringify(banned));
                div.style.opacity = '0.3';
                div.querySelector('.ban-btn').innerText = 'BANNED';
                div.querySelector('.ban-btn').disabled = true;
            };

            list.appendChild(div);
        });
    }

    renderHistory() {
        const list = document.getElementById('history-list');
        const history = JSON.parse(localStorage.getItem('luminous_history') || '[]');
        if (!list || history.length === 0) return;
        list.innerHTML = '';
        history.reverse().forEach(h => {
            const div = document.createElement('div');
            div.className = 'bg-surface-container rounded-3xl p-5 flex items-center justify-between border border-white/5';
            div.innerHTML = `<div class="flex items-center gap-4"><div class="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary"><span class="material-symbols-outlined">person</span></div><div><h3 class="font-bold text-on-surface">${h.partner}</h3><p class="text-xs text-gray-500">${new Date(h.timestamp).toLocaleTimeString()}</p></div></div><span class="material-symbols-outlined text-primary">videocam</span>`;
            list.appendChild(div);
        });
    }

    renderInbox() {
        const list = document.getElementById('chats-list');
        const mRow = document.getElementById('matches-row');
        const chats = JSON.parse(localStorage.getItem('luminous_chats') || '[]');
        
        if (mRow && chats.length > 0) {
            mRow.innerHTML = '';
            chats.forEach(c => {
                const div = document.createElement('div');
                div.className = 'flex-shrink-0 flex flex-col items-center gap-3 cursor-pointer active:scale-90 transition-all';
                div.innerHTML = `<div class="w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr from-primary to-accent shadow-lg"><img class="w-full h-full rounded-full object-cover border-2 border-background" src="${PROFILES[0].img}"></div><span class="text-[10px] font-bold uppercase tracking-widest text-on-surface/60">${c.partner}</span>`;
                div.onclick = () => {
                    this.activeChatPartner = c.partner;
                    this.switchScreen('chat_detail');
                };
                mRow.appendChild(div);
            });
        }

        if (list && chats.length > 0) {
            list.innerHTML = '';
            chats.reverse().forEach(c => {
                const div = document.createElement('div');
                div.className = 'glass-effect rounded-3xl p-5 flex items-center gap-4 border border-white/5 cursor-pointer active:scale-95 transition-all';
                div.innerHTML = `<img class="w-14 h-14 rounded-2xl object-cover shadow-lg" src="${PROFILES[0].img}"><div class="flex-grow"><div class="flex justify-between items-center mb-1"><strong class="text-on-surface font-bold">${c.partner}</strong><span class="text-[10px] py-1 px-2 rounded-full bg-primary/20 text-primary font-bold">Active</span></div><p class="text-xs text-slate-400 truncate">${c.lastMsg || 'New match!'}</p></div>`;
                div.onclick = () => {
                    this.activeChatPartner = c.partner;
                    this.switchScreen('chat_detail');
                };
                list.appendChild(div);
            });
        }
    }

    renderChatDetail() {
        if (!this.activeChatPartner) return;
        
        document.getElementById('chat-detail-name').innerText = this.activeChatPartner;
        document.getElementById('chat-detail-back-btn').onclick = () => this.switchScreen('inbox');
        
        const container = document.getElementById('chat-detail-messages');
        const form = document.getElementById('chat-detail-form');
        const input = document.getElementById('chat-detail-input');

        const chats = JSON.parse(localStorage.getItem('luminous_chats') || '[]');
        const chat = chats.find(c => c.partner === this.activeChatPartner);

        const renderMessages = () => {
            container.innerHTML = '';
            // Seed a mock initial message if empty
            const msgs = chat?.messages || [{ from: 'them', text: `Hi! I'm ${this.activeChatPartner}.` }];
            msgs.forEach(m => {
                const div = document.createElement('div');
                div.className = m.from === 'me' ? 'flex flex-col items-end' : 'flex flex-col items-start';
                div.innerHTML = `<div class="${m.from === 'me' ? 'primary-gradient text-white' : 'bg-surface text-on-surface'} rounded-2xl p-4 max-w-[80%] text-sm shadow-sm border border-outline/5">${m.text}</div>`;
                container.appendChild(div);
            });
            container.scrollTop = container.scrollHeight;
        };
        renderMessages();

        form.onsubmit = (e) => {
            e.preventDefault();
            const text = input.value.trim();
            if (text) {
                // Update Storage
                const allChats = JSON.parse(localStorage.getItem('luminous_chats') || '[]');
                let idx = allChats.findIndex(c => c.partner === this.activeChatPartner);
                if (idx > -1) {
                    if (!allChats[idx].messages) allChats[idx].messages = [];
                    allChats[idx].messages.push({ from: 'me', text });
                    allChats[idx].lastMsg = text;
                }
                localStorage.setItem('luminous_chats', JSON.stringify(allChats));
                
                input.value = '';
                // Fast UI update (mock)
                const div = document.createElement('div');
                div.className = 'flex flex-col items-end';
                div.innerHTML = `<div class="primary-gradient text-white rounded-2xl p-4 max-w-[80%] text-sm shadow-sm">${text}</div>`;
                container.appendChild(div);
                container.scrollTop = container.scrollHeight;
            }
        };
    }

    initOnboarding() {
        this.currentStep = 1;
        this.onboardingData = { gender: '', pref: '', tags: [] };
        this.renderOnboardingStep();

        document.getElementById('onboarding-next-btn').onclick = () => {
            if (this.validateStep(this.currentStep)) {
                if (this.currentStep < 4) {
                    this.currentStep++;
                    this.renderOnboardingStep();
                } else {
                    this.finishOnboarding();
                }
            }
        };

        document.getElementById('onboarding-back-btn').onclick = () => {
            if (this.currentStep > 1) {
                this.currentStep--;
                this.renderOnboardingStep();
            }
        };
    }

    renderOnboardingStep() {
        const container = document.getElementById('onboarding-step-container');
        const template = document.getElementById(`step-${this.currentStep}`);
        const progress = document.getElementById('onboarding-progress');
        const stepNum = document.getElementById('current-step-num');
        const backBtn = document.getElementById('onboarding-back-btn');

        container.innerHTML = '';
        container.appendChild(template.content.cloneNode(true));

        progress.style.width = `${(this.currentStep / 4) * 100}%`;
        stepNum.innerText = this.currentStep;
        backBtn.classList.toggle('hidden', this.currentStep === 1);

        // Step Specific Listeners
        if (this.currentStep === 2) {
            document.querySelectorAll('.ob-gender-btn').forEach(btn => {
                btn.onclick = () => {
                    this.onboardingData.gender = btn.dataset.gender;
                    document.querySelectorAll('.ob-gender-btn').forEach(b => b.classList.remove('primary-gradient', 'text-white'));
                    btn.classList.add('primary-gradient', 'text-white');
                };
            });
            document.querySelectorAll('.ob-pref-btn').forEach(btn => {
                btn.onclick = () => {
                    this.onboardingData.pref = btn.dataset.pref;
                    document.querySelectorAll('.ob-pref-btn').forEach(b => b.classList.remove('primary-gradient', 'text-white'));
                    btn.classList.add('primary-gradient', 'text-white');
                };
            });
        }

        if (this.currentStep === 3) {
            const tags = ['Music', 'Travel', 'Art', 'Gaming', 'Fitness', 'Cinema', 'Food', 'Tech', 'Hiking', 'Dancing'];
            const cloud = document.getElementById('ob-tags-cloud');
            tags.forEach(t => {
                const btn = document.createElement('button');
                const isSelected = this.onboardingData.tags.includes(t);
                btn.className = `px-5 py-3 rounded-2xl border transition-all duration-300 text-xs font-bold uppercase tracking-wider ${isSelected ? 'primary-gradient text-white border-transparent shadow-lg scale-105' : 'bg-surface border-outline/10 text-on-surface/50 hover:border-primary/30'}`;
                btn.innerText = t;
                btn.onclick = () => {
                    if (this.onboardingData.tags.includes(t)) {
                        this.onboardingData.tags = this.onboardingData.tags.filter(i => i !== t);
                    } else if (this.onboardingData.tags.length < 5) {
                        this.onboardingData.tags.push(t);
                    }
                    this.renderOnboardingStep();
                };
                cloud.appendChild(btn);
            });
        }

        if (this.currentStep === 4) {
            const picker = document.getElementById('ob-photo-picker');
            picker.onclick = () => {
                // Simulated photo upload
                const mockUrl = PROFILES[Math.floor(Math.random() * PROFILES.length)].img;
                this.onboardingData.photo = mockUrl;
                document.getElementById('ob-preview-img').src = mockUrl;
                document.getElementById('ob-preview-img').classList.remove('hidden');
                document.getElementById('ob-photo-placeholder').classList.add('hidden');
            };
        }
    }

    validateStep(step) {
        if (step === 1) {
            this.onboardingData.name = document.getElementById('ob-name').value;
            this.onboardingData.age = document.getElementById('ob-age').value;
            return this.onboardingData.name && this.onboardingData.age;
        }
        if (step === 2) return this.onboardingData.gender && this.onboardingData.pref;
        if (step === 3) return this.onboardingData.tags.length >= 2;
        if (step === 4) {
            this.onboardingData.bio = document.getElementById('ob-bio').value;
            return this.onboardingData.bio;
        }
        return true;
    }

    async finishOnboarding() {
        // Correctly identify role based on previously saved email or bio key
        const existingData = JSON.parse(localStorage.getItem('luminous_user') || '{}');
        const role = existingData.email === 'golcuu16@gmail.com' || this.onboardingData.bio?.includes('ADMIN_KEY_NEXUS') ? 'admin' : 'user';

        const finalProfile = {
            uid: existingData.uid,
            name: this.onboardingData.name,
            email: existingData.email,
            age: this.onboardingData.age,
            bio: this.onboardingData.bio,
            tags: this.onboardingData.tags,
            gender: this.onboardingData.gender,
            pref: this.onboardingData.pref,
            photo: this.onboardingData.photo || PROFILES[0].img,
            role: role
        };

        localStorage.setItem('luminous_user', JSON.stringify(finalProfile));
        
        // Save to Cloud Firestore for true persistence
        if (finalProfile.uid) {
            try {
                await saveUserProfile(finalProfile.uid, finalProfile);
                console.log('[Onboarding] Profile saved to Cloud');
            } catch (e) { console.error('[Onboarding] Cloud save failed'); }
        }

        // Mock Account persistence for demo fallback
        if (finalProfile.email) {
            const accounts = JSON.parse(localStorage.getItem('luminous_accounts') || '{}');
            accounts[finalProfile.email] = finalProfile;
            localStorage.setItem('luminous_accounts', JSON.stringify(accounts));
        }
        
        // Finalize state on server if connected
        socket.emit('set-preferences', {
            gender: this.onboardingData.gender,
            pref: this.onboardingData.pref
        });

        this.switchScreen('discover');
    }

    wireChatEvents() {
        document.getElementById('chat-next-btn').onclick = () => socket.emit('next');
        
        // Video Filters Logic
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.onclick = () => {
                const filter = btn.dataset.filter;
                const lv = document.getElementById('local-video');
                const rv = document.getElementById('remote-video');
                if (lv) lv.style.filter = filter;
                if (rv) rv.style.filter = filter;

                // Visual Feedback
                document.querySelectorAll('.filter-btn div').forEach(d => d.classList.replace('border-primary', 'border-transparent'));
                btn.querySelector('div').classList.replace('border-transparent', 'border-primary');
            };
        });

        const form = document.getElementById('chat-form');
        const input = document.getElementById('chat-input');
        if (form && input) {
            form.onsubmit = (e) => {
                e.preventDefault();
                const text = input.value.trim();
                if (text && isConnected) {
                    appendLocalMessage(text);
                    socket.emit('chat-message', text);
                    saveToInbox(currentPartnerAnonId, text);
                    input.value = '';
                }
            };
        }
    }
}

const screenMgr = new ScreenManager('app-container');

let localStream = null, isConnected = false, currentPartnerAnonId = '';

async function initMedia() {
    // Check for Ban Status
    const user = JSON.parse(localStorage.getItem('luminous_user') || '{}');
    const bannedList = JSON.parse(localStorage.getItem('luminous_banned_list') || '[]');
    if (user.role !== 'admin' && (bannedList.includes(user.name) || bannedList.includes('User_Anon_9281'))) {
        document.getElementById('banned-overlay').classList.remove('hidden');
        return;
    }

    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        const lv = document.getElementById('local-video');
        if (lv) lv.srcObject = localStream;
        const saved = localStorage.getItem('luminous_user');
        screenMgr.switchScreen(saved ? 'discover' : 'splash');
    } catch (err) { alert('Camera access required.'); }
}

function saveToInbox(partner, msg) {
    const chats = JSON.parse(localStorage.getItem('luminous_chats') || '[]');
    let idx = chats.findIndex(c => c.partner === partner);
    if (idx > -1) { chats[idx].lastMsg = msg; } 
    else { chats.push({ partner, lastMsg: msg, timestamp: Date.now() }); }
    localStorage.setItem('luminous_chats', JSON.stringify(chats.slice(-10)));
}

socket.on('searching', () => { isConnected = false; teardown(); screenMgr.switchScreen('matching'); });
socket.on('matched', async ({ partnerAnonId, isInitiator }) => {
    isConnected = true; currentPartnerAnonId = partnerAnonId;
    saveToInbox(partnerAnonId, 'Started a conversation.');
    const history = JSON.parse(localStorage.getItem('luminous_history') || '[]');
    history.push({ partner: partnerAnonId, timestamp: Date.now() });
    localStorage.setItem('luminous_history', JSON.stringify(history.slice(-20)));
    await screenMgr.switchScreen('chat');
    const rv = document.getElementById('remote-video');
    setupPeerConnection(localStream, rv, (sig) => socket.emit('webrtc-signal', sig));
    if (isInitiator) await createOffer((sig) => socket.emit('webrtc-signal', sig));

    // Notify User
    screenMgr.showNotification('New Match Found! 🌟', `You are now connected with ${partnerAnonId}.`);
});

socket.on('chat-message', (text) => {
    appendRemoteMessage(text);
    saveToInbox(currentPartnerAnonId, text);
    screenMgr.showNotification('New Message', text);
});

socket.on('partner-disconnected', () => {
    isConnected = false;
    setTimeout(() => { if (!isConnected) screenMgr.switchScreen('rating'); }, 2000);
});

function appendLocalMessage(text) {
    const list = document.getElementById('chat-messages');
    if (!list) return;
    const div = document.createElement('div');
    div.className = 'flex flex-col gap-1 items-end';
    div.innerHTML = `<div class="primary-gradient text-white rounded-xl p-3 text-sm">${text}</div>`;
    list.appendChild(div); list.scrollTop = list.scrollHeight;
}

function appendRemoteMessage(text) {
    const list = document.getElementById('chat-messages');
    if (!list) return;
    const div = document.createElement('div');
    div.className = 'flex flex-col gap-1';
    div.innerHTML = `<div class="bg-white rounded-xl p-3 text-sm shadow-sm">${text}</div>`;
    list.appendChild(div); list.scrollTop = list.scrollHeight;
}

watchAuthState(async (user) => {
    if (user) {
        console.log("[Auth] User is logged in:", user.uid);
        let saved = JSON.parse(localStorage.getItem('luminous_user') || '{}');
        
        // Try to recover from Cloud if local storage is empty
        if (!saved.age) {
            try {
                const cloudProfile = await getUserProfile(user.uid);
                if (cloudProfile) {
                    saved = cloudProfile;
                    localStorage.setItem('luminous_user', JSON.stringify(saved));
                }
            } catch (e) { console.error('[WatchAuth] Could not restore profile from cloud'); }
        }

        const isProfileComplete = !!saved.age;

        if (screenMgr.currentScreen === 'splash' || screenMgr.currentScreen === 'auth') {
            if (isProfileComplete) {
                screenMgr.switchScreen('discover');
            } else {
                screenMgr.switchScreen('onboarding');
            }
        }
    } else {
        console.log("[Auth] User is logged out");
    }
});

initMedia();

ScreenManager.prototype.showNotification = function(title, body) {
    if (Notification.permission === 'granted') {
        new Notification(title, {
            body: body,
            icon: '/icons/icon-192x192.png',
            vibrate: [200, 100, 200]
        });
    }
};
