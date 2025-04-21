# WireGraph3

A powerful interactive visualization tool for comparing portfolio performance against market benchmarks.

## Features

- **Interactive Line and Bar Charts**: Visualize portfolio performance alongside major market indices like S&P 500, Dow Jones, Nasdaq, etc.
- **Dual Time Periods**: Switch between 52-week and full year views
- **Customizable Display**: Control chart type, canvas size, graph dimensions, and grid appearance
- **Area Fill Controls**: Adjust opacity and visibility of area fills for each line
- **Export Options**: Save as SVG or copy SVG code to clipboard
- **Responsive Design**: Works on various screen sizes

## Keyboard Shortcuts

- `s` - Save current chart as SVG file
- `c` - Copy SVG code to clipboard

## Live Demo

You can view a live demo at: [https://haraujo77.github.io/wiregraph3/](https://haraujo77.github.io/wiregraph3/)

## Local Development

To run locally:

```bash
# Clone the repository
git clone https://github.com/Haraujo77/wiregraph3.git

# Navigate to the directory
cd wiregraph3

# Start a local server (Python example)
python -m http.server 8000
```

Then open `http://localhost:8000` in your browser.

## Technologies Used

- p5.js for rendering
- p5.svg.js for SVG export functionality
- Vanilla JavaScript