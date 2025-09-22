# Actionpackd AI SDK Website

A modern, responsive marketing website for the Actionpackd AI SDK.

## Features

- Responsive design with mobile-first approach
- Interactive playground with mock AI providers
- Schema validation demonstration
- Accessible and SEO-friendly
- Zero external dependencies (vanilla JS)
- Dark mode code blocks
- Copy-to-clipboard functionality

## Running Locally

1. Clone the repository
2. Run a local server:
   ```bash
   # Using npm
   npm install
   npm start

   # Or using npx directly
   npx serve
   ```

## Development

The site is built with vanilla technologies:
- HTML5
- CSS3 (with CSS custom properties)
- JavaScript (ES6+)

### File Structure

- `index.html` - Main HTML file
- `styles.css` - All styles including responsive design
- `app.js` - JavaScript for interactivity and playground
- `1.png` - Actionpackd logo

### Color Palette

The site uses a color palette extracted from the Actionpackd logo:
- Primary: #0B3D91 (Navy Blue)
- Secondary: #00BCD4 (Cyan)
- Accent: #36454F (Slate)
- Background: #FFFFFF (White)
- Text: #1A1A1A (Dark Gray)
- Muted: #718096 (Gray)

## Deployment

The site is configured for deployment on Vercel:

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Deploy:
   ```bash
   vercel
   ```

Or connect your GitHub repository to Vercel for automatic deployments.

## License

MIT License - see LICENSE file for details
