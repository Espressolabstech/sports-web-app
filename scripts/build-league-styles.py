"""Builds <app>/src/league/league.scoped.css from src/league (rerun after changing any league file): the reference's Tailwind 4 utilities + its league CSS, scoped to .tn-scope."""
import sys, subprocess, re, os, tempfile
# Usage (from the app folder): python3 scripts/build-league-styles.py
# Tailwind 4 (the reference's version) is installed into a throwaway folder: this app's own Tailwind 3 is never touched.
app = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
here = tempfile.mkdtemp(prefix='league-tw4-')
subprocess.run(['npm', 'init', '-y'], cwd=here, check=True, capture_output=True)
subprocess.run(['npm', 'install', 'tailwindcss@4.2.1', '@tailwindcss/cli@4.2.1', 'tw-animate-css@1.3.4'], cwd=here, check=True, capture_output=True)
# The reference's theme (its src/styles.css @theme block), as-is.
theme = """@theme inline {
 --font-sans: 'Manrope', sans-serif;
 --font-display: 'Barlow Condensed', sans-serif;
 --color-background: var(--background); --color-foreground: var(--foreground);
 --color-card: var(--card); --color-card-foreground: var(--foreground);
 --color-popover: var(--popover, var(--card)); --color-popover-foreground: var(--foreground);
 --color-primary: var(--primary); --color-primary-foreground: var(--primary-foreground);
 --color-secondary: var(--secondary); --color-secondary-foreground: var(--foreground);
 --color-muted: var(--secondary); --color-muted-foreground: var(--muted-foreground);
 --color-accent: var(--accent); --color-accent-foreground: var(--foreground);
 --color-destructive: var(--destructive); --color-destructive-foreground: var(--foreground);
 --color-border: var(--border); --color-input: var(--input); --color-ring: var(--ring, var(--primary));
 --color-surface: var(--surface, var(--card)); --color-surface-raised: var(--surface-raised, var(--secondary));
 --color-surface-hover: var(--surface-hover, var(--accent)); --color-surface-selected: var(--surface-selected, var(--secondary));
 --color-ink: var(--ink, var(--foreground)); --color-ink-muted: var(--ink-muted, var(--muted-foreground));
 --color-border-strong: var(--border-strong, var(--input));
 --color-lime: var(--lime, var(--primary)); --color-lime-hover: var(--lime-hover, var(--primary)); --color-lime-pressed: var(--lime-pressed, var(--primary));
 --color-success: var(--success); --color-warning: var(--warning); --color-danger: var(--danger, var(--destructive)); --color-info: var(--info);
 --color-selected: var(--selected, var(--foreground)); --color-selected-foreground: var(--selected-foreground, var(--background));
 --radius-sm: 4px; --radius-md: 6px; --radius-lg: 8px; --radius-xl: 8px;
}"""
open(f'{here}/input.css', 'w').write(f'''@import "tailwindcss/theme.css";
@import "tailwindcss/utilities.css" source(none);
@import "tw-animate-css";
@source "{app}/src/league";
{theme}
''')
subprocess.run(['npx', '@tailwindcss/cli', '-i', 'input.css', '-o', 'out.css'], cwd=here, check=True, capture_output=True)
out = open(f'{here}/out.css').read()
out = re.sub(r'^/\*!.*?\*/\n', '', out)
out = out.replace('@layer properties;\n', '', 1)
# theme variables: on the league scope instead of :root
start = out.index(':root, :host {')
end = out.index('\n}\n', start) + 3
theme_block = '.tn-scope {' + out[start + len(':root, :host {'):end]
rest = out[end:]
cut = rest.index('@property')
utilities, tail = rest[:cut], rest[cut:]
league = open(f'{app}/src/league/league.css').read()
base = """
.tn-scope { font-family: var(--font-sans); color: var(--foreground); }
.tn-scope, .tn-scope * { border-color: var(--border); letter-spacing: 0; }
h1, h2, .display { font-family: var(--font-display); font-weight: 700; line-height: 1; }
"""
SCOPE = ':where(.tn-scope, .tn-scope *)'

def scope_css(css):
    """Prefix every top-level (or @media/@supports-level) selector with SCOPE: the element itself or anything inside."""
    out, i, n = [], 0, len(css)
    def block(i, depth_kind):
        res = []
        while i < n:
            # skip whitespace/comments
            if css[i].isspace():
                res.append(css[i]); i += 1; continue
            if css.startswith('/*', i):
                j = css.index('*/', i) + 2; res.append(css[i:j]); i = j; continue
            if css[i] == '}':
                return ''.join(res), i
            j = i
            while j < n and css[j] not in '{};':
                j += 1
            if j >= n: res.append(css[i:]); return ''.join(res), n
            head = css[i:j]
            if css[j] == ';':  # at-statement like @import
                res.append(css[i:j+1]); i = j + 1; continue
            if css[j] == '}':
                res.append(head); i = j; continue
            stripped = head.strip()
            if not stripped:
                res.append(head); i = j; continue
            if stripped.startswith('@'):
                if stripped.startswith(('@media', '@supports', '@container')):
                    inner, k = block(j + 1, 'group')
                    res.append(head + '{' + inner + '}'); i = k + 1; continue
                # keyframes / property etc: copy verbatim (balanced)
                depth, k = 0, j
                while k < n:
                    if css[k] == '{': depth += 1
                    elif css[k] == '}':
                        depth -= 1
                        if depth == 0: break
                    k += 1
                res.append(css[i:k+1]); i = k + 1; continue
            # style rule: prefix each selector, copy body verbatim (balanced, may contain nesting)
            sels = [x.strip() for x in stripped.split(',')]
            pre = ', '.join(x if x.startswith(('.tn-scope', ':root')) else SCOPE + x if x[0] in '.:[#' else SCOPE + ' ' + x if False else (SCOPE + x if x[0] in '.:[' else f'{SCOPE} {x}' if not x.startswith('*') else f'{SCOPE}{x[1:] or ""}') for x in sels)
            depth, k = 0, j
            while k < n:
                if css[k] == '{': depth += 1
                elif css[k] == '}':
                    depth -= 1
                    if depth == 0: break
                k += 1
            res.append('\n' + pre + ' ' + css[j:k+1]); i = k + 1
        return ''.join(res), i
    body, _ = block(0, 'top')
    return body

css = f"""/*
 * GENERATED by build-league-styles — do not edit. The Lovable reference's league styles, exactly as the reference builds
 * them (Tailwind 4 + its theme + src/league/league.css), limited to .tn-scope (the league pages and their pop-ups) at the
 * same specificity as this app's own utilities, loaded after them — so they win there and never touch any other page.
 */
{theme_block}
{scope_css(utilities)}
{scope_css(base)}
{scope_css(league)}
{tail}"""
open(f'{app}/src/league/league.scoped.css', 'w').write(css)
print('wrote', len(css), 'bytes')
