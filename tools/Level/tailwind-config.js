// Tailwind CSS Configuration
tailwind.config = {
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                theme: {
                   background: 'rgb(255, 255, 255)',
                   surface: 'rgb(247, 247, 247)',
                   border: 'rgb(230, 230, 230)',
                   'text-primary': 'rgb(5, 5, 5)',
                   'text-muted': 'rgb(107, 114, 128)',
                   accent: 'rgb(0, 122, 255)',
                   'accent-contrast': 'rgb(255, 255, 255)',
                   success: 'rgb(40, 167, 69)',
                   error: 'rgb(220, 53, 69)',
                   info: 'rgb(23, 162, 184)',
                   warning: 'rgb(255, 193, 7)',
                   'accent-rgb': '0, 122, 255',
                   'text-primary-rgb': '5, 5, 5',
                },
                darkTheme: {
                   background: 'rgb(20, 20, 20)',
                   surface: 'rgb(30, 30, 30)',
                   border: 'rgb(50, 50, 50)',
                   'text-primary': 'rgb(240, 240, 240)',
                   'text-muted': 'rgb(150, 150, 150)',
                   accent: 'rgb(0, 122, 255)',
                   'accent-contrast': 'rgb(255, 255, 255)',
                   success: 'rgb(40, 167, 69)',
                   error: 'rgb(220, 53, 69)',
                   info: 'rgb(23, 162, 184)',
                   warning: 'rgb(255, 193, 7)',
                   'accent-rgb': '0, 122, 255',
                   'text-primary-rgb': '240, 240, 240',
                },
            },
            fontFamily: {
                sans: ['Sora', 'sans-serif'],
            },
            transitionTimingFunction: {
                'custom-ease': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            },
            boxShadow: {
                'subtle': '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
                'subtle-dark': '0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.18)',
            }
        }
    }
};
