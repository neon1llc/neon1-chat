# Cookie and browser storage notice (https://neon1.tech/1NEON/cookies)

The only cookies and browser storage neon1.tech and 1NEON use, and why.

*Last updated November 16, 2026.* This update adds `neon1.theme`, which keeps the dark or light look you chose on the sign-in and public pages, shared with neon1.tech. There's no new tracking.

This notice is part of the [privacy and data policy](https://neon1.tech/1NEON/privacy) and lists, in detail, every cookie and item neon1 saves in your browser. Neither neon1.tech nor the 1NEON portal uses analytics, advertising, or tracking of any kind.

## neon1.tech

The website sets no cookies. Your browser saves two small things, on your device only:

| Saved item | What it's for | How long it lasts |
|---|---|---|
| `neon1.rain` (local storage) | The rain settings you pick: grid or free, the characters, and pause | Until you clear it |

## The 1NEON portal

The portal uses only the cookies it needs to sign you in and keep you signed in:

| Cookie | What it's for | How long it lasts |
|---|---|---|
| `__Secure-1neon_at` | Keeps you signed in (access token) | 15 minutes |
| `__Secure-1neon_rt` | Renews your sign-in without asking again | Up to 30 days, or until you sign out. Without "remember me", until you close the browser |
| `__Secure-1neon_step` | Holds a sign-in in progress between steps | 5 minutes |
| `__Secure-1neon_rm` | Remembers your "remember me" choice during sign-in | 5 minutes |
| `__Secure-1neon_flow` | Protects sign-in with Google, which is turned off today, so it isn't set | 10 minutes |
| Sign-in service cookies on auth.neon1.tech | Protect the sign-in step (Amazon Cognito) | Your sign-in session |

These cookies are strictly necessary, can only be read by the portal's own server, are never used for advertising or analytics, and are never shared. Because of that, the portal doesn't show a cookie consent banner. If you block them, you won't be able to sign in.

The portal also saves, on your device only:

| Saved item | What it's for | How long it lasts |
|---|---|---|
| `1neon.last` (local storage) | Whether you were last signed in, so a reload starts on the right background | Until you clear it |
| `1neon.email` (local storage) | With Remember me ticked, the email you signed in with, so it's filled in next time. Unticked, it's cleared | Until you sign in with Remember me unticked, or clear it |
| `1neon.lastOrg` (local storage) | The organization you last had open, so pages outside one (your profile, the FAQs) keep its menu | Until you clear it |
| `1neon.signup` (local storage) | Whether free-account sign-up was open when you last opened sign-in, so the page shows the right wording at once | Until you clear it |
| `neon1.theme` (local storage) | That you chose the dark (matrix) or light (awake) look with the switch on sign-in and the public pages. Shared with neon1.tech | Until you clear it |
| `1neon.motion` (local storage) | That you chose **Reduced** motion on your profile, which turns 1NEON's animations off in this browser | Until you choose **Smooth** again, or clear it |
| `1neon.face-ask.` and an organization's ID (local storage) | Admins only: that you chose **Not now** when Home asked where to see your business, so it stops asking in this browser | Until you clear it |
| `1neon.signin` (session storage) | Your email and the sign-in step in progress, so a reload mid sign-in returns to the code step. The code itself is never saved | 5 minutes, or until the tab closes |
| `neon1.rain` (local storage) | The same rain settings as the website, on the sign-in screen | Until you clear it |
| `1neon.projects.view`, `1neon.projects.view.sort` (local storage) | Whether you last looked at projects as a list or a timeline, and how you sorted them | Until you clear it |
| `1neon.tour-offered` (session storage) | That the welcome tour was already offered, so it isn't offered again in this tab | Until the tab closes |
| `1neon-export` (the browser's private file storage) | Admins only: the zip from **Download everything** while it's built, so a large export doesn't fill memory. Never sent anywhere; your browser copies it to your downloads | 30 minutes after it's saved; if you close the tab sooner, the next time you open Settings or start an export |

Your other preferences, such as your theme, are saved with your account.

The interactive demo (neon1.tech/1NEON/demo) and the guided walkthrough (neon1.tech/1NEON/live) run entirely in your browser. Once their pages and files have loaded from neon1.tech, which is how any page reaches you, they make no further calls: nothing you do in them is sent to me or to anyone else, and they use no analytics, fonts, or media from other sites. The interactive demo keeps your changes where your browser allows it; if it doesn't, the demo still works and lasts until you close or reload the tab. The guided walkthrough starts from fresh fictional data on every load and never saves its data.

| Saved item | What it's for | How long it lasts |
|---|---|---|
| `1neon-demo` (IndexedDB) | Interactive demo only: its sample data and any files you add, so it survives a reload | Until you choose Start over or clear site data |
| `1neon.devUser` (local storage) | Interactive demo: which sample person you chose to be | Until you clear it |
| `1neon.liveUser` (local storage) | Guided walkthrough: which fictional person is signed in on screen | Until you clear it; the walkthrough resets it on every load |
| `1neon.live` (session storage) | Guided walkthrough: the chapter playing, so a reload picks up there (from fresh data) | Until the tab closes |
| `1neon.liveFrom` (session storage) | Guided walkthrough: the page and answer you opened it from, so Exit takes you back there | Until the tab closes |
| `1neon.liveSpeed` (local storage) | The walkthrough speed you picked | Until you clear it |

If I ever add optional cookies or storage, such as analytics, I'll update this notice and ask for your consent first.
