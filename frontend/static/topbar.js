class AppTopbar extends HTMLElement {
    connectedCallback() {
        const path = window.location.pathname;

        const links = [
            { href: '/',         icon: '⊞', label: 'Tag Manager' },
            { href: '/details',  icon: '◧', label: 'Access Log'  },
            { href: '/users',    icon: '◉', label: 'Users'       },
            { href: '/register', icon: '⊕', label: 'Accounts'    },
            { href: '/camera',   icon: '⊡', label: 'Camera'      },
        ];

        const navHTML = links.map(({ href, icon, label }) => {
            const active = href === '/' ? path === '/' : path.startsWith(href);
            return active
                ? `<span class="nav-item active nav-admin"><span class="nav-icon">${icon}</span> ${label}</span>`
                : `<a href="${href}" class="nav-item nav-admin"><span class="nav-icon">${icon}</span> ${label}</a>`;
        }).join('');

        const header = document.createElement('header');
        header.className = 'topbar';
        header.innerHTML = `
            <div class="topbar-brand">
                <span class="logo-icon">◈</span>
                <div>
                    <div class="logo-title">SENTINEL</div>
                    <div class="logo-sub">Access Control System</div>
                </div>
            </div>
            <nav class="topbar-nav">${navHTML}</nav>
            <div class="topbar-user">
                <span class="topbar-email" id="topbar-email"></span>
                <button class="topbar-logout-btn" id="topbar-logout">LOGOUT</button>
            </div>
        `;

        this.replaceWith(header);
    }
}

customElements.define('app-topbar', AppTopbar);
