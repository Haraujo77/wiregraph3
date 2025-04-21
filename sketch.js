// WireGraph 3 - Portfolio Benchmark Comparison

let jsonData; // To hold data from portfolio_performance file
let indicesData; // To hold data from all_indices file
let portfolioData = {};
let benchmarkData = [];

// --- Control Variables ---
let canvasWidth = 800;
let canvasHeight = 600;
let graphWidth = 700;
let graphHeight = 500;
let verticalGridMode = 'weeks'; // << ADDED: weeks, months, none
let isPanelCollapsed = false; // << ADDED: State for panel
let chartType = 'line'; // << ADDED: 'line' or 'bar'
let barWidthRatio = 0.8; // << ADDED: 0.1 to 1.0, proportion of available space
let barDisplayStyle = 'overlay'; // << ADDED: 'overlay' or 'grouped'
let barGroupGapRatio = 0.1; // << ADDED: 0.0 to 0.5, proportion of space between groups
let timePeriodMode = 'full_year'; // Changed default from '52_weeks' to 'full_year'

let lineSettings = []; // Will store { name, ticker, data, normalizedData, visible, color, stroke, opacity, gradientOpacity, showGradient }

// --- Hover State ---
let hoverIndex = -1;
let isHoveringGraph = false;

// --- p5.js Pointers ---
let canvas;
let controlsDiv;
let canvasContainerDiv;

// --- UI Element Pointers ---
let canvasWidthSlider, canvasWidthInput;
let canvasHeightSlider, canvasHeightInput;
let graphWidthSlider, graphWidthInput;
let graphHeightSlider, graphHeightInput;
let saveSvgButton; // << ADDED: Pointer for the button
let copySvgButton; // << ADDED: Pointer for Copy SVG button
let verticalGridRadios; // << ADDED: Pointer for grid radios
let collapseButton; // << ADDED: Pointer for collapse button
let dynamicControlsContainer; // << ADDED: Pointer for the new container
let toggleAreasButton; // << ADDED: Pointer for the global toggle button
let chartTypeRadios; // << ADDED: Pointer for chart type radios
let barSettingsGroup; // << ADDED: Pointer for Bar Settings group
let barWidthSlider, barWidthInput; // << ADDED
let barStyleRadios; // << ADDED
let barGroupGapSlider, barGroupGapInput; // << ADDED
let barGroupGapDiv; // << ADDED: Pointer to containing div
let timePeriodRadios; // << ADDED: Pointer for time period radios

// Additional date tracking variables
let dateLabels = []; // Will hold date labels for data points

function preload() {
    jsonData = loadJSON('portfolio_performance_20250418_230752.json');
    indicesData = loadJSON('all_indices_20250418_214547.json');
}

// Function to extract the 52 weeks data points from the full year data
function extract52WeeksData(historicalData) {
    const weeklyData = [];
    let lastDayOfWeek = new Date(historicalData[0].date); // Start with the most recent date
    
    // Add the most recent date as the first point
    weeklyData.push(historicalData[0].close);
    
    // Get the day of the week (0=Sunday, 1=Monday, ..., 6=Saturday)
    const dayOfWeek = lastDayOfWeek.getDay();
    
    // Find the previous Friday (or last trading day of each week)
    // We'll look for Fridays as they're typically the last trading day of the week
    let targetDayOfWeek = 5; // 5 = Friday
    
    // Loop through historical data to extract weekly points
    let weekCount = 1; // We already have the first point
    let currentIndex = 1; // Start from the second point in the historical data
    
    while (weekCount < 52 && currentIndex < historicalData.length) {
        const currentDate = new Date(historicalData[currentIndex].date);
        
        // If we've moved to a different week (crossed a weekend)
        if (currentDate.getDay() === targetDayOfWeek || 
            (new Date(historicalData[currentIndex-1].date).getTime() - currentDate.getTime()) >= 3 * 24 * 60 * 60 * 1000) {
            weeklyData.push(historicalData[currentIndex].close);
            weekCount++;
        }
        
        currentIndex++;
    }
    
    // If we don't have enough weeks, fill with the last available value
    const lastValue = weeklyData[weeklyData.length - 1];
    while (weeklyData.length < 52) {
        weeklyData.push(lastValue);
    }
    
    // Reverse the array to have oldest data first
    return weeklyData.reverse();
}

// Function to extract full year data points
function extractFullYearData(historicalData) {
    // Simply extract all closing prices from the historical data
    const fullYearData = historicalData.map(day => day.close);
    // Reverse to have oldest data first
    return fullYearData.reverse();
}

function processIndicesData() {
    const processedIndices = [];
    dateLabels = []; // Reset date labels
    
    // Process each index we want to include
    const indicesToInclude = [
        { symbol: "^GSPC", name: "S&P 500" },
        { symbol: "^DJI", name: "Dow Jones" },
        { symbol: "^IXIC", name: "Nasdaq" },
        { symbol: "^RUT", name: "Russell 2000" },
        { symbol: "^FTSE", name: "FTSE 100" }
    ];
    
    // We'll use S&P 500 as the reference for dates
    const spHistorical = indicesData["^GSPC"]?.historical || [];
    if (spHistorical.length > 0) {
        // Extract weekly and full year dates from the SP500 data
        const weeklyDates = [];
        const fullYearDates = [];
        
        // Full year dates (reversed to match data order)
        fullYearDates.push(...spHistorical.map(day => day.date).reverse());
        
        // Extract weekly dates similar to extract52WeeksData
        let lastDayOfWeek = new Date(spHistorical[0].date);
        weeklyDates.push(spHistorical[0].date);
        
        let targetDayOfWeek = 5; // 5 = Friday
        let weekCount = 1;
        let currentIndex = 1;
        
        while (weekCount < 52 && currentIndex < spHistorical.length) {
            const currentDate = new Date(spHistorical[currentIndex].date);
            
            if (currentDate.getDay() === targetDayOfWeek || 
                (new Date(spHistorical[currentIndex-1].date).getTime() - currentDate.getTime()) >= 3 * 24 * 60 * 60 * 1000) {
                weeklyDates.push(spHistorical[currentIndex].date);
                weekCount++;
            }
            
            currentIndex++;
        }
        
        // If we don't have enough weeks, fill with the last available date
        const lastDate = weeklyDates[weeklyDates.length - 1];
        while (weeklyDates.length < 52) {
            weeklyDates.push(lastDate);
        }
        
        // Reverse to have oldest date first
        const reversedWeeklyDates = weeklyDates.reverse();
        
        // Store in dateLabels based on time period mode
        dateLabels = {
            weekly: reversedWeeklyDates,
            fullYear: fullYearDates
        };
    }
    
    indicesToInclude.forEach(index => {
        if (indicesData[index.symbol]) {
            const historicalData = indicesData[index.symbol].historical;
            
            if (historicalData && historicalData.length > 0) {
                // Extract data based on time period mode
                const weeklyData = extract52WeeksData(historicalData);
                const fullYearData = extractFullYearData(historicalData);
                
                processedIndices.push({
                    name: index.name,
                    ticker: index.symbol,
                    weeklyData: weeklyData,
                    fullYearData: fullYearData
                });
            }
        }
    });
    
    return processedIndices;
}

function setup() {
    console.log("Starting setup function with timePeriodMode:", timePeriodMode);
    
    canvasContainerDiv = select('#canvas-container');
    controlsDiv = select('#controls');
    collapseButton = select('#collapse-btn');
    collapseButton.mousePressed(toggleControlPanel);
    dynamicControlsContainer = select('#dynamic-controls-container'); // << ADDED: Select the new container

    // Dynamically determine initial canvas size based on container, but with defaults
    let containerRect = canvasContainerDiv.elt.getBoundingClientRect();
    canvasWidth = containerRect.width > 150 ? containerRect.width - 40 : 800; // Use default if container is too small initially
    canvasHeight = containerRect.height > 150 ? containerRect.height - 40 : 600;

    // Ensure graph isn't bigger than initial canvas
    graphWidth = min(canvasWidth - 50, 700);
    graphHeight = min(canvasHeight - 50, 500);

    canvas = createCanvas(canvasWidth, canvasHeight, SVG); // Use SVG renderer
    canvas.parent('canvas-container');

    processData();
    createControls(); // Create controls after setting initial sizes
    
    // Force an initial redraw after everything is set up
    redraw();
    
    console.log("Setup completed, time period:", timePeriodMode, "chart type:", chartType);
}

function processData() {
    console.log("Processing data with timePeriodMode:", timePeriodMode);
    
    // Process portfolio data from portfolio_performance JSON
    let rawPortfolioData = jsonData;
    if (rawPortfolioData && rawPortfolioData.daily_values) {
        // Convert the daily_values to the format we need
        // Reverse the array to have oldest first
        const dailyValues = [...rawPortfolioData.daily_values].reverse();
        
        // Extract portfolio values
        const portfolioValues = dailyValues.map(day => day.value);
        const portfolioDates = dailyValues.map(day => day.date);
        
        // Create the portfolio data object
        portfolioData = {
            name: "Portfolio",
            data: portfolioValues,
            dates: portfolioDates
        };
    } else {
        console.error("Portfolio data is missing or invalid in portfolio_performance JSON");
    }
    
    // Process benchmark data from indices file
    const processedIndices = processIndicesData();
    
    // Use processed indices as benchmarks
    benchmarkData = processedIndices;

    lineSettings = []; // Reset

    // Get a reference to S&P 500 data to align portfolio data length
    const sp500Index = benchmarkData.find(bm => bm.ticker === '^GSPC');
    let weeklyDataLength = 0;
    let fullYearDataLength = 0;
    
    if (sp500Index) {
        weeklyDataLength = sp500Index.weeklyData.length;
        fullYearDataLength = sp500Index.fullYearData.length;
    }

    // --- Add Portfolio ---
    if (portfolioData && portfolioData.data) {
        // Adjust portfolio data to match index data lengths
        let portfolioWeeklyData = [];
        let portfolioFullYearData = [];
        
        if (weeklyDataLength > 0) {
            // Extract weekly data points (properly aligned with weekly dates)
            portfolioWeeklyData = extractPortfolioWeeklyData(portfolioData, weeklyDataLength, dateLabels);
        }
        
        if (fullYearDataLength > 0) {
            // For full year, use all data or interpolate
            if (portfolioData.data.length >= fullYearDataLength) {
                // Take the most recent data points to match fullYearDataLength
                portfolioFullYearData = portfolioData.data.slice(-fullYearDataLength);
            } else {
                // Interpolate the data to match the full year length
                portfolioFullYearData = interpolateData(portfolioData.data, fullYearDataLength);
            }
        }
        
        // Use the data that matches the current time period
        const portfolioCurrentData = timePeriodMode === '52_weeks' ? portfolioWeeklyData : portfolioFullYearData;
        
        // Force white color and 2px width for portfolio
        lineSettings.push({
            name: portfolioData.name || 'Portfolio',
            ticker: 'Portfolio',
            data: portfolioCurrentData,
            normalizedData: normalizeData(portfolioCurrentData),
            visible: true,
            color: '#fff', // White color
            stroke: 2,     // 2px stroke width 
            opacity: 255,  // Fully opaque
            fillOpacity: 25,
            showGradient: true
        });
    } else {
        console.error("Portfolio data is missing or invalid");
    }


    // --- Add Benchmarks ---
    const defaultColors = ['#4682B4', '#3CB371', '#FFD700', '#DB7093', '#00CED1']; // SteelBlue, MediumSeaGreen, Gold, PaleVioletRed, DarkTurquoise
    if (benchmarkData && Array.isArray(benchmarkData)) {
        benchmarkData.forEach((bm, index) => {
            if (bm) {
                // Use the data according to the selected time period
                const data = timePeriodMode === '52_weeks' ? bm.weeklyData : bm.fullYearData;
                
                if (data && data.length > 0) {
                     lineSettings.push({
                        name: bm.name || `Benchmark ${index+1}`,
                        ticker: bm.ticker || 'N/A',
                        data: data,
                        normalizedData: normalizeData(data),
                        visible: true,
                        color: defaultColors[index % defaultColors.length],
                        stroke: 1,     // Force 1px stroke width for benchmarks
                        opacity: 200,   // Slightly transparent
                        fillOpacity: 20,
                        showGradient: true
                    });
                } else {
                     console.warn(`Benchmark data at index ${index} is missing or invalid.`);
                }
            }
        });
    } else {
         console.error("Benchmark data is missing or invalid");
    }
    
    console.log("Data processing complete. Portfolio and", lineSettings.length - 1, "benchmarks loaded.");
}

// New function to extract portfolio data aligned with weekly dates
function extractPortfolioWeeklyData(portfolioData, targetLength, dateLabels) {
    if (!portfolioData || !portfolioData.data || !portfolioData.dates || 
        !dateLabels || !dateLabels.weekly || dateLabels.weekly.length === 0) {
        console.warn("Missing data for extracting weekly portfolio data");
        return portfolioData.data.slice(-targetLength); // Fallback to simple slicing
    }
    
    const result = [];
    const portfolioDates = portfolioData.dates;
    const portfolioValues = portfolioData.data;
    const weeklyDates = dateLabels.weekly;
    
    console.log("Extracting weekly data with target length:", targetLength);
    console.log("Weekly dates available:", weeklyDates.length);
    console.log("Portfolio data available:", portfolioValues.length);
    
    // Find the closest portfolio date for each weekly date
    for (let i = 0; i < weeklyDates.length && i < targetLength; i++) {
        const targetDate = new Date(weeklyDates[i]);
        let bestIndex = 0;
        let bestDiff = Infinity;
        
        // Find the portfolio date closest to the target weekly date
        for (let j = 0; j < portfolioDates.length; j++) {
            const portfolioDate = new Date(portfolioDates[j]);
            const diffDays = Math.abs((targetDate - portfolioDate) / (1000 * 60 * 60 * 24));
            
            if (diffDays < bestDiff) {
                bestDiff = diffDays;
                bestIndex = j;
                
                // If exact match, break early
                if (diffDays < 1) break;
            }
        }
        
        // Add the corresponding portfolio value
        result.push(portfolioValues[bestIndex]);
    }
    
    // If we don't have enough points, pad with the last value
    while (result.length < targetLength) {
        const lastValue = result.length > 0 ? result[result.length - 1] : 100;
        result.push(lastValue);
    }
    
    console.log("Extracted weekly data points:", result.length);
    return result;
}

// Function to interpolate data points to match a desired length
function interpolateData(sourceData, targetLength) {
    if (sourceData.length === targetLength) {
        return [...sourceData];
    }
    
    const result = [];
    
    if (sourceData.length === 1) {
        // If we only have a single data point, repeat it
        for (let i = 0; i < targetLength; i++) {
            result.push(sourceData[0]);
        }
    } else {
        // For each target position, calculate the interpolated value
        for (let i = 0; i < targetLength; i++) {
            const t = i / (targetLength - 1); // normalized position
            const sourcePosition = t * (sourceData.length - 1);
            const lowerIndex = Math.floor(sourcePosition);
            const upperIndex = Math.ceil(sourcePosition);
            
            if (lowerIndex === upperIndex) {
                result.push(sourceData[lowerIndex]);
            } else {
                const weight = sourcePosition - lowerIndex;
                const interpolatedValue = sourceData[lowerIndex] * (1 - weight) + sourceData[upperIndex] * weight;
                result.push(interpolatedValue);
            }
        }
    }
    
    return result;
}

// Normalizes data so the first point is 100
function normalizeData(dataArray) {
    if (!dataArray || !Array.isArray(dataArray) || dataArray.length === 0) {
        console.warn("Invalid data array for normalization:", dataArray);
        return [];
    }
    const firstValue = dataArray[0];
    // Handle cases where data might not be numbers
    if (typeof firstValue !== 'number' || isNaN(firstValue)) {
        console.warn("First data point is not a valid number:", firstValue);
        return dataArray.map(() => 100); // Return a flat line at 100
    }

    if (firstValue === 0) {
        // If the series starts at 0, normalization to 100 is tricky.
        // We could return all zeros, or find the first non-zero, or just return 100s.
        // Returning 100s is consistent with % change thinking from zero base.
        console.warn("Data series starts at 0, normalizing all points to 100.");
        return dataArray.map(() => 100);
    }

    return dataArray.map(val => {
        if (typeof val !== 'number' || isNaN(val)) {
             console.warn("Invalid data point encountered during normalization:", val);
             return 100; // Or some other default handling
        }
        return (val / firstValue) * 100;
    });
}


function createControls() {
    dynamicControlsContainer.html(''); // Clear previous controls from the dynamic container

    // --- General Controls ---
    let generalGroup = createDiv().parent(dynamicControlsContainer).addClass('control-group');
    createElement('h4', 'General').parent(generalGroup);
    saveSvgButton = createButton('Save as SVG').parent(generalGroup);
    saveSvgButton.mousePressed(saveDiagramAsSvg);
    saveSvgButton.style('margin-top', '5px'); // Adjust spacing
    saveSvgButton.style('margin-right', '5px'); // Add spacing between buttons

    copySvgButton = createButton('Copy SVG Code').parent(generalGroup); // << ADDED
    copySvgButton.mousePressed(copyDiagramAsSvg); // << ADDED
    copySvgButton.style('margin-top', '5px'); // << ADDED
    copySvgButton.style('margin-right', '5px'); // Add spacing

    toggleAreasButton = createButton('Toggle All Areas').parent(generalGroup); // << ADDED
    toggleAreasButton.mousePressed(toggleAllAreaFills); // << ADDED
    toggleAreasButton.style('margin-top', '5px'); // << ADDED

    // --- Time Period Selection ---
    createElement('h5', 'Time Period').parent(generalGroup).style('margin-top', '15px').style('margin-bottom', '5px');
    timePeriodRadios = createRadio().parent(generalGroup);
    timePeriodRadios.option('52_weeks', '52 Weeks');
    timePeriodRadios.option('full_year', 'Full Year');
    timePeriodRadios.selected(timePeriodMode); // Ensure this properly selects the default option
    timePeriodRadios.changed(updateTimePeriod);
    timePeriodRadios.style('margin-bottom', '10px');

    // --- Chart Type Selection ---
    createElement('h5', 'Chart Type').parent(generalGroup).style('margin-top', '15px').style('margin-bottom', '5px');
    chartTypeRadios = createRadio().parent(generalGroup);
    chartTypeRadios.option('line', 'Line Chart');
    chartTypeRadios.option('bar', 'Bar Chart');
    chartTypeRadios.option('mixed', 'Mixed (Portfolio Bar)');
    chartTypeRadios.selected(chartType); // Ensure this properly selects the default option
    chartTypeRadios.changed(updateChartType);
    chartTypeRadios.style('margin-bottom', '10px');

    // --- Canvas Size Controls ---
    let canvasGroup = createDiv().parent(dynamicControlsContainer).addClass('control-group'); // Parent is dynamic container
    createElement('h4', 'Canvas Size').parent(canvasGroup);
    // Width
    let cwDiv = createDiv('Width: ').parent(canvasGroup).style('display', 'flex').style('align-items', 'center');
    canvasWidthSlider = createSlider(100, 1500, canvasWidth, 10).parent(cwDiv).input(updateCanvasSize).style('flex-grow', '1');
    canvasWidthInput = createInput(canvasWidth.toString(), 'number').parent(cwDiv).input(updateCanvasSize).style('width', '60px');
    // Height
    let chDiv = createDiv('Height: ').parent(canvasGroup).style('display', 'flex').style('align-items', 'center');
    canvasHeightSlider = createSlider(100, 1000, canvasHeight, 10).parent(chDiv).input(updateCanvasSize).style('flex-grow', '1');
    canvasHeightInput = createInput(canvasHeight.toString(), 'number').parent(chDiv).input(updateCanvasSize).style('width', '60px');

    // --- Graph Size Controls ---
    let graphGroup = createDiv().parent(dynamicControlsContainer).addClass('control-group'); // Parent is dynamic container
    createElement('h4', 'Graph Area Size').parent(graphGroup);
    // Width
    let gwDiv = createDiv('Width: ').parent(graphGroup).style('display', 'flex').style('align-items', 'center');
    graphWidthSlider = createSlider(50, canvasWidth - 50, graphWidth, 5).parent(gwDiv).input(updateGraphSize).style('flex-grow', '1');
    graphWidthInput = createInput(graphWidth.toString(), 'number').parent(gwDiv).input(updateGraphSize).style('width', '60px');
    // Height
    let ghDiv = createDiv('Height: ').parent(graphGroup).style('display', 'flex').style('align-items', 'center');
    graphHeightSlider = createSlider(50, canvasHeight - 50, graphHeight, 5).parent(ghDiv).input(updateGraphSize).style('flex-grow', '1');
    graphHeightInput = createInput(graphHeight.toString(), 'number').parent(ghDiv).input(updateGraphSize).style('width', '60px');

    // --- Grid Controls ---
    let gridGroup = createDiv().parent(dynamicControlsContainer).addClass('control-group'); // Parent is dynamic container
    createElement('h4', 'Vertical Grid').parent(gridGroup);
    verticalGridRadios = createRadio().parent(gridGroup);
    verticalGridRadios.option('weeks', '52 Weeks');
    verticalGridRadios.option('months', '12 Months');
    verticalGridRadios.option('none', 'None');
    verticalGridRadios.selected(verticalGridMode);
    verticalGridRadios.changed(updateGridMode);
    verticalGridRadios.style('margin-top', '5px');

    // --- Bar Chart Settings (Initially hidden) ---
    barSettingsGroup = createDiv().parent(dynamicControlsContainer).addClass('control-group');
    createElement('h4', 'Bar Chart Settings').parent(barSettingsGroup);
    // Width Ratio
    let bwDiv = createDiv('Bar Width (%): ').parent(barSettingsGroup).style('display', 'flex').style('align-items', 'center');
    // Map 0.1-1.0 ratio to 10-100 percent for slider
    barWidthSlider = createSlider(10, 100, barWidthRatio * 100, 1).parent(bwDiv).input(updateBarWidth).style('flex-grow', '1');
    barWidthInput = createInput((barWidthRatio * 100).toString(), 'number').parent(bwDiv).input(updateBarWidth).style('width', '60px');
    // Group Gap Ratio
    barGroupGapDiv = createDiv('Group Gap (%): ').parent(barSettingsGroup).style('display', 'flex').style('align-items', 'center');
    // Map 0.0-0.5 ratio to 0-50 percent
    barGroupGapSlider = createSlider(0, 50, barGroupGapRatio * 100, 1).parent(barGroupGapDiv).input(updateBarGroupGap).style('flex-grow', '1');
    barGroupGapInput = createInput((barGroupGapRatio * 100).toString(), 'number').parent(barGroupGapDiv).input(updateBarGroupGap).style('width', '60px');
    // Display Style
    createElement('h5', 'Bar Display Style').parent(barSettingsGroup).style('margin-top', '15px').style('margin-bottom', '5px');
    barStyleRadios = createRadio().parent(barSettingsGroup);
    barStyleRadios.option('overlay', 'Overlay');
    barStyleRadios.option('grouped', 'Grouped');
    barStyleRadios.selected(barDisplayStyle);
    barStyleRadios.changed(updateBarStyle);

    // --- Line Controls ---
     createElement('h4', 'Line Settings').parent(dynamicControlsContainer); // Parent is dynamic container
    lineSettings.forEach((line, index) => {
        let lineGroup = createDiv().parent(dynamicControlsContainer).addClass('control-group line-controls'); // Parent is dynamic container
        let titleDiv = createDiv().parent(lineGroup).style('display', 'flex').style('align-items', 'center').style('margin-bottom', '10px');

        // Toggle Visibility Checkbox - ensure it reflects current visibility state
        let visLabel = createCheckbox('', line.visible).parent(titleDiv).style('margin-right', '10px');
        visLabel.checked(line.visible); // Explicitly set checkbox state to match line.visible
        visLabel.changed(() => {
            line.visible = visLabel.checked();
            redraw(); // Ensure canvas is redrawn when visibility changes
        });

        // Color Swatch and Title
        let colorSwatch = createSpan('&nbsp;&nbsp;&nbsp;').parent(titleDiv)
          .style('background-color', line.color)
          .style('padding', '0 8px')
          .style('border', '1px solid #ccc')
          .style('margin-right', '10px');
        createElement('strong', `${line.name} (${line.ticker})`).parent(titleDiv);


        // Color Picker and Text Input
        let cpContainer = createDiv('Color: ').parent(lineGroup).style('display', 'flex').style('align-items', 'center');
        let colorPicker = createColorPicker(line.color).parent(cpContainer);
        let colorInput = createInput(line.color, 'text').parent(cpContainer)
           .style('width', '150px').style('margin-left', '10px');

        // Event listener for the text input
        colorInput.input(() => {
            let inputText = colorInput.value().trim(); // Trim whitespace
            try {
                // Attempt to parse the input color
                let parsedColor = color(inputText);

                // Rudimentary check if p5 parsing failed (might return black or transparent)
                // This isn't perfect but tries to catch obvious errors.
                if (alpha(parsedColor) === 0 && !inputText.match(/(transparent|rgba?\(.*, *0\)|hsla?\(.*, *0%?\))/i)) {
                    throw new Error("Parsed color has zero alpha, likely an error.");
                }

                let storeValue = '';
                // Check if the *original* input looks like hsl format (case-insensitive)
                if (inputText.toLowerCase().startsWith('hsl(')) {
                    // If input looked like HSL and parsed without throwing error, store the original HSL string
                    storeValue = inputText;
                } else {
                    // Otherwise, store the standard hex format (#rrggbb)
                    storeValue = parsedColor.toString('#rrggbb');
                }

                // Update internal state with either original HSL or converted hex
                line.color = storeValue;

                // Update the color picker to match the parsed color (picker needs hex)
                colorPicker.value(parsedColor.toString('#rrggbb'));
                // Update the swatch
                colorSwatch.style('background-color', parsedColor.toString('#rrggbb'));
                // Clear any potential error styling
                // colorInput.style('border-color', '');

            } catch (e) {
                console.warn("Invalid color input:", inputText, e);
                // Optional: Visual feedback for invalid input (e.g., red border)
                // colorInput.style('border-color', 'red');
                // Don't update anything if the input was invalid
            }
        });

        // Event listener for the color picker
        colorPicker.input(() => {
            line.color = colorPicker.value(); // Picker returns hex #rrggbb
            colorInput.value(line.color); // Update text input
            colorSwatch.style('background-color', line.color); // Update swatch
            // redraw(); // No longer needed
        });


        // Stroke Weight
        let swDiv = createDiv('Stroke: ').parent(lineGroup);
        let strokeInput = createInput(line.stroke.toString(), 'number').parent(swDiv)
            .attribute('step', '0.1').attribute('min', '0.1')
            .style('width', '50px').style('margin-left', '5px');
        strokeInput.input(() => {
            let val = parseFloat(strokeInput.value());
            if (!isNaN(val) && val > 0) {
                line.stroke = val;
                redraw();
            }
        });

        // Opacity
        let opDiv = createDiv('Opacity: ').parent(lineGroup);
        let opacityInput = createInput(line.opacity.toString(), 'number').parent(opDiv)
            .attribute('step', '1').attribute('min', '0').attribute('max', '255')
            .style('width', '50px').style('margin-left', '5px');
         opacityInput.input(() => {
             let val = parseInt(opacityInput.value());
            if (!isNaN(val) && val >= 0 && val <= 255) {
                line.opacity = val;
                redraw();
            }
        });

        // Gradient Toggle Checkbox
        let gradToggleDiv = createDiv().parent(lineGroup);
        let gradientCheckbox = createCheckbox(' Show Area Fill', line.showGradient).parent(gradToggleDiv); // << Renamed label slightly
        gradientCheckbox.changed(() => {
            line.showGradient = gradientCheckbox.checked();
            // redraw(); // No longer needed
        });
        // Store the checkbox element for global toggle
        line.gradientCheckboxElement = gradientCheckbox; // << ADDED: Store reference

        // Add Fill Area Opacity control (Previously Gradient)
        let fillOpDiv = createDiv('Area Fill Opacity (%): ').parent(lineGroup);
        line.fillOpacityInputElement = createInput(line.fillOpacity.toString(), 'number').parent(fillOpDiv) // << Store reference
            .attribute('step', '1').attribute('min', '0').attribute('max', '100') // << Changed max to 100
            .style('width', '50px').style('margin-left', '5px');
        line.fillOpacityInputElement.input(() => { // << Use stored reference
            let val = parseInt(line.fillOpacityInputElement.value());
            if (!isNaN(val) && val >= 0 && val <= 100) { // Check range 0-100
                line.fillOpacity = val;
                 // redraw();
            }
        });

        // Store references to disable/enable based on chart type
        line.gradientToggleDiv = gradToggleDiv;
        line.fillOpacityDiv = fillOpDiv;
    });
    
    // Ensure all lines are properly visible by default
    lineSettings.forEach((line, index) => {
        // Mark all lines as visible initially
        line.visible = true;
        
        // ... rest of the line settings code ...
    });
    
    // This explicitly selects all line visibility checkboxes after control creation
    for (let i = 0; i < lineSettings.length; i++) {
        let line = lineSettings[i];
        if (line.gradientCheckboxElement) {
            line.gradientCheckboxElement.checked(line.showGradient);
        }
    }

    redraw(); // Initial draw after creating controls
    updateChartType(); // Call once initially to set control visibility
}

function updateCanvasSize() {
    let wVal, hVal;
    // Get value from either slider or input that triggered the event
    // Check the type of element that triggered the event
    if (this.elt.type === 'range') { // Slider changed
        wVal = canvasWidthSlider.value();
        hVal = canvasHeightSlider.value();
        canvasWidthInput.value(wVal); // Update input field
        canvasHeightInput.value(hVal);
    } else { // Input field changed
        wVal = parseInt(canvasWidthInput.value());
        hVal = parseInt(canvasHeightInput.value());
         if (!isNaN(wVal)) canvasWidthSlider.value(wVal); // Update slider
         if (!isNaN(hVal)) canvasHeightSlider.value(hVal);
    }


    canvasWidth = parseInt(canvasWidthSlider.value()); // Read final value from slider
    canvasHeight = parseInt(canvasHeightSlider.value());


    if (isNaN(canvasWidth) || canvasWidth < 100) canvasWidth = 100;
    if (isNaN(canvasHeight) || canvasHeight < 100) canvasHeight = 100;

    // --- Adjust Graph Size and Controls ---
    // Ensure graph size isn't larger than canvas (minus padding) & update controls
    let maxGraphW = canvasWidth - 50;
    let maxGraphH = canvasHeight - 50;

    graphWidth = min(graphWidth, maxGraphW); // Keep current graph width if possible, else shrink
    graphHeight = min(graphHeight, maxGraphH);

    graphWidthSlider.attribute('max', maxGraphW); // Update slider limits
    graphHeightSlider.attribute('max', maxGraphH);

    graphWidthSlider.value(graphWidth); // Update slider positions
    graphHeightSlider.value(graphHeight);
    graphWidthInput.value(graphWidth);   // Update input fields
    graphHeightInput.value(graphHeight);

    resizeCanvas(canvasWidth, canvasHeight);
}


function updateGraphSize() {
     let wVal, hVal;
    // Get value from either slider or input that triggered the event
     if (this.elt.type === 'range') { // Slider changed
         wVal = graphWidthSlider.value();
         hVal = graphHeightSlider.value();
         graphWidthInput.value(wVal);
         graphHeightInput.value(hVal);
     } else { // Input field changed
         wVal = parseInt(graphWidthInput.value());
         hVal = parseInt(graphHeightInput.value());
         if (!isNaN(wVal)) graphWidthSlider.value(wVal);
         if (!isNaN(hVal)) graphHeightSlider.value(hVal);
     }


    graphWidth = parseInt(graphWidthSlider.value());
    graphHeight = parseInt(graphHeightSlider.value());

    // Ensure graph size is within bounds (min and max based on current canvas)
    let maxGraphW = canvasWidth - 50;
    let maxGraphH = canvasHeight - 50;
    graphWidth = constrain(graphWidth, 50, maxGraphW);
    graphHeight = constrain(graphHeight, 50, maxGraphH);

    // Update both controls again after constraining
    graphWidthSlider.value(graphWidth);
    graphWidthInput.value(graphWidth);
    graphHeightSlider.value(graphHeight);
    graphHeightInput.value(graphHeight);


    redraw();
}


function draw() {
    background(30); // Dark background (match CSS #1e1e1e approx)

    // --- Center Graph Area ---
    let graphX = (canvasWidth - graphWidth) / 2;
    let graphY = (canvasHeight - graphHeight) / 2;

    // Draw Graph Background
    push(); // Isolate styling
    fill(0); // Black background for graph area
    noStroke(); // Remove border around graph area
    rect(graphX, graphY, graphWidth, graphHeight);
    pop();

    // --- Check if we have line settings ---
    if (!lineSettings || lineSettings.length === 0) {
        console.error("No line settings available");
        push();
        fill(150);
        noStroke();
        textAlign(CENTER, CENTER);
        textSize(14);
        text('No data loaded. Check console for errors.', canvasWidth / 2, canvasHeight / 2);
        pop();
        return;
    }

    // Force at least one line to be visible
    let anyVisible = lineSettings.some(line => line.visible);
    if (!anyVisible && lineSettings.length > 0) {
        console.warn("No visible lines, making portfolio visible");
        lineSettings[0].visible = true; // Make portfolio visible by default
    }

    // --- Prepare Data for Plotting ---
    let allVisibleData = [];
    lineSettings.forEach(line => {
        if (line.visible && line.normalizedData && line.normalizedData.length > 0) {
            allVisibleData = allVisibleData.concat(line.normalizedData);
        }
    });

    if (allVisibleData.length === 0) {
        // Draw placeholder text if no lines are visible or data is bad
        push();
        fill(150);
        noStroke();
        textAlign(CENTER, CENTER);
        textSize(14);
        text('No data visible. Check controls or data.json.', canvasWidth / 2, canvasHeight / 2);
        pop();
        return; // Stop drawing if nothing to plot
    }

    // --- Calculate Y-axis Range ---
    let minY = min(allVisibleData);
    let maxY = max(allVisibleData);
     // Add some padding to min/max Y unless they are the same
    let yPadding = (maxY - minY) * 0.1; // 10% padding top and bottom
     if (abs(maxY - minY) < 0.01) { // Check if effectively flat
        minY -= 5; // Arbitrary padding if flat line (e.g., all 100)
        maxY += 5;
    } else {
        minY -= yPadding;
        maxY += yPadding;
    }


    // --- Draw Axis (simple lines for now) ---
    push();
    stroke(100); // Lighter grey for axes on dark background
    strokeWeight(1);
    // Y-axis (left) - REMOVED
    // line(graphX, graphY, graphX, graphY + graphHeight);
    // X-axis (bottom) - REMOVED
    // line(graphX, graphY + graphHeight, graphX + graphWidth, graphY + graphHeight);

     // Optional: Draw simple grid lines
     // let numGridLines = 5; // Old fixed grid
     stroke(60); // Darker grid lines
     // Horizontal grid lines - REMOVED
     /*
     for(let i = 1; i < numGridLines; i++) {
         let y = lerp(graphY, graphY + graphHeight, i / numGridLines);
         line(graphX, y, graphX + graphWidth, y);
     }
     */

     // --- Draw Vertical Grid Lines based on Mode ---
     if (verticalGridMode !== 'none') {
         let numVerticalLines = 0;
         
         if (verticalGridMode === 'weeks') {
             // Always show 52 lines when 'weeks' mode is selected, regardless of time period
             numVerticalLines = 52;
         } else if (verticalGridMode === 'months') {
             numVerticalLines = 11; // 11 lines for 12 month sections
         }

         if (numVerticalLines > 0) {
             push();
             stroke(60); // Darker grid lines
             strokeWeight(1);
             
             // Get the number of data points for the first visible line
             let dataLength = 0;
             let firstVisibleLine = lineSettings.find(line => line.visible && line.normalizedData && line.normalizedData.length > 0);
             if (firstVisibleLine) {
                 dataLength = firstVisibleLine.normalizedData.length;
             }

             // Draw evenly spaced grid lines
             for(let i = 1; i <= numVerticalLines; i++) {
                 // Distribute lines evenly across the graph
                 let t = i / (numVerticalLines + 1);
                 let x = lerp(graphX, graphX + graphWidth, t);
                 line(x, graphY, x, graphY + graphHeight);
             }
             pop();
         }
     }

    pop(); // Restore default stroke, etc.

    // --- Hover Detection ---
    isHoveringGraph = (mouseX >= graphX && mouseX <= graphX + graphWidth &&
                       mouseY >= graphY && mouseY <= graphY + graphHeight);

    hoverIndex = -1; // Reset hover index
    let numPoints = 0; // Get the number of points from the first visible line
    let firstVisibleLine = lineSettings.find(line => line.visible && line.normalizedData && line.normalizedData.length > 0);
    if (firstVisibleLine) {
        numPoints = firstVisibleLine.normalizedData.length;
    }

    if (isHoveringGraph && numPoints > 0) {
        // Find the closest data point index based on mouseX
        // Map mouseX to an index (0 to numPoints-1)
        hoverIndex = floor(map(mouseX, graphX, graphX + graphWidth, 0, numPoints)); // Use floor for bars
        hoverIndex = constrain(hoverIndex, 0, numPoints - 1);
    }

    // --- Draw Chart based on Type --- 
    if (chartType === 'line') {
        // Draw all lines + fills
        drawLinesAndAreaFills(graphX, graphY, graphWidth, graphHeight, minY, maxY, line => true);
    } else if (chartType === 'bar') {
        // Draw all bars
        drawBars(graphX, graphY, graphWidth, graphHeight, minY, maxY, line => true);
    } else if (chartType === 'mixed') {
        // Draw Portfolio as bar, Benchmarks as lines (no area fills)
        drawBars(graphX, graphY, graphWidth, graphHeight, minY, maxY, line => line.ticker === 'Portfolio');
        drawLinesAndAreaFills(graphX, graphY, graphWidth, graphHeight, minY, maxY, line => line.ticker !== 'Portfolio', false); // Draw benchmarks as lines with area fills
    }

    // --- Draw Hover Vertical Line and Text ---
    if (isHoveringGraph && hoverIndex !== -1 && numPoints > 0) {
        let hoverX;
        if (chartType === 'line') {
             hoverX = map(hoverIndex, 0, numPoints - 1, graphX, graphX + graphWidth);
        } else { // For bar chart, center line within the bar
            let barWidth = graphWidth / numPoints;
            hoverX = map(hoverIndex, 0, numPoints, graphX, graphX + graphWidth) + barWidth / 2;
        }

        push();
        stroke(200, 200, 200, 150); // Semi-transparent white line
        strokeWeight(1);
        line(hoverX, graphY, hoverX, graphY + graphHeight);

        // Display hover information with date label
        let hoverTextY = graphY + 15; // Position text at the top of the graph
        textAlign(LEFT, TOP);
        noStroke();
        fill(230); // Light text color
        textSize(12);

        let textXOffset = hoverX + 5 < graphX + graphWidth - 80 ? hoverX + 5 : hoverX - 85; // Adjust text pos based on hoverX

        // Display date if available
        const currentDateLabels = timePeriodMode === '52_weeks' ? dateLabels.weekly : dateLabels.fullYear;
        if (currentDateLabels && hoverIndex < currentDateLabels.length) {
            const dateStr = currentDateLabels[hoverIndex];
            fill(200); // Gray text for date
            text(dateStr, textXOffset, hoverTextY);
            hoverTextY += 16; // Move down for values
        }

        let lineInfoY = hoverTextY;
        lineSettings.forEach(line => {
            if(line.visible && line.normalizedData && line.normalizedData.length > hoverIndex){
                let val = line.normalizedData[hoverIndex];
                let c = color(line.color);
                c.setAlpha(255); // Full opacity for text
                fill(c);
                text(`${line.ticker}: ${nf(val, 0, 2)}`, textXOffset, lineInfoY);
                lineInfoY += 14; // Move down for next line
            }
        });

        pop();
    }

    // Draw performance comparison info at the top
    if (lineSettings.length > 0) {
        push();
        textAlign(CENTER, TOP);
        textSize(14);
        fill(255);
        text("Portfolio vs. Benchmarks Performance", canvasWidth / 2, graphY - 25);
        
        // Calculate final values for comparison
        if (timePeriodMode === '52_weeks') {
            text("52-Week Performance", canvasWidth / 2, graphY - 45);
        } else {
            text("Full Year Performance", canvasWidth / 2, graphY - 45);
        }
        
        // Calculate and show performance metrics
        let compareY = graphY + graphHeight + 15;
        textAlign(LEFT, TOP);
        textSize(12);
        
        let portfolioLine = lineSettings.find(line => line.ticker === 'Portfolio');
        if (portfolioLine && portfolioLine.normalizedData && portfolioLine.normalizedData.length > 0) {
            const portfolioPerf = portfolioLine.normalizedData[portfolioLine.normalizedData.length - 1] - 100;
            fill(portfolioPerf >= 0 ? '#4CAF50' : '#F44336'); // Green for positive, red for negative
            text(`Portfolio: ${portfolioPerf >= 0 ? '+' : ''}${nf(portfolioPerf, 0, 2)}%`, graphX, compareY);
            
            // Compare with benchmarks
            let compareX = graphX + 150;
            lineSettings.forEach(line => {
                if (line.ticker !== 'Portfolio' && line.visible && line.normalizedData && line.normalizedData.length > 0) {
                    const benchmarkPerf = line.normalizedData[line.normalizedData.length - 1] - 100;
                    const diffWithPortfolio = portfolioPerf - benchmarkPerf;
                    
                    fill(line.color);
                    text(`${line.ticker}: ${benchmarkPerf >= 0 ? '+' : ''}${nf(benchmarkPerf, 0, 2)}%`, compareX, compareY);
                    
                    // Show outperformance/underperformance
                    fill(diffWithPortfolio >= 0 ? '#4CAF50' : '#F44336');
                    text(`(${diffWithPortfolio >= 0 ? '+' : ''}${nf(diffWithPortfolio, 0, 2)}%)`, compareX + 120, compareY);
                    
                    compareY += 20; // Move down for next benchmark
                    if (compareY > graphY + graphHeight + 120) {
                        // Start a new column if we run out of vertical space
                        compareY = graphY + graphHeight + 15;
                        compareX += 250;
                    }
                }
            });
        }
        pop();
    }

     // Future improvements:
     // - Draw axis labels (dates, percentage values)
     // - Add a legend to identify lines by color
}

// Re-calculate sizes and redraw if the window is resized
function windowResized() {
    // Calculate available width for canvas container
    let availableWidth = windowWidth;
    if (!isPanelCollapsed) {
        availableWidth -= controlsDiv.width; // Subtract panel width if visible
    }

    canvasContainerDiv.style('width', `${availableWidth}px`);
    canvasContainerDiv.style('height', `${windowHeight}px`); // Use full window height

    // Calculate potential new canvas dimensions based on the container
    let newWidth = max(300, availableWidth - 40); // Subtract padding/margin
    let newHeight = max(300, windowHeight - 40);

    // Only resize and redraw if the change is significant to avoid loops/jitter
    if (abs(newWidth - canvasWidth) > 10 || abs(newHeight - canvasHeight) > 10) {

        canvasWidth = newWidth;
        canvasHeight = newHeight;

        // Update the control values to reflect the new canvas size
        canvasWidthInput.value(canvasWidth);
        canvasWidthSlider.value(canvasWidth);
        canvasHeightInput.value(canvasHeight);
        canvasHeightSlider.value(canvasHeight);

        // Trigger the same logic as manually changing canvas size
        // This will handle graph constraints and redraw everything correctly
        updateCanvasSize();
        redraw(); // Force redraw after resize
    }
}

// --- Save SVG Functionality ---

// << ADDED: Function called by the button
function saveDiagramAsSvg() {
    // Format filename with current date/time
    let timestamp = `${year()}-${nf(month(), 2)}-${nf(day(), 2)}_${nf(hour(), 2)}-${nf(minute(), 2)}-${nf(second(), 2)}`;
    save(`wiregraph-${timestamp}.svg`);
    console.log("Saved as SVG via button");
}

function keyPressed() {
    if (key === 's' || key === 'S') {
        saveDiagramAsSvg(); // Use the same save function
        console.log("Saved as SVG via 's' key");
    } else if (key === 'c' || key === 'C') {
        copyDiagramAsSvg(); // Use the copy function
        console.log("Copied SVG to clipboard via 'c' key");
    }
}

// --- Copy SVG Functionality --- ADDED
function copyDiagramAsSvg() {
    let svgElement = document.querySelector('#canvas-container svg');
    if (!svgElement) {
        console.error("Could not find SVG element to copy.");
        alert("Error: Could not find SVG element.");
        return;
    }

    // Serialize the SVG element to string
    let serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(svgElement);

    // Add XML declaration and potentially doctype for better compatibility
    svgString = '<?xml version="1.0" standalone="no"?>\n' + svgString;
    // <!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">

    // Use the Clipboard API
    navigator.clipboard.writeText(svgString).then(() => {
        console.log('SVG code copied to clipboard!');
        // Optional: Give user feedback (e.g., change button text briefly)
        copySvgButton.html('Copied!');
        setTimeout(() => { copySvgButton.html('Copy SVG Code'); }, 1500);
    }).catch(err => {
        console.error('Failed to copy SVG: ', err);
        alert("Error: Could not copy SVG to clipboard. Check browser permissions or console.");
    });
}

// << ADDED: Function to update grid mode
function updateGridMode() {
    verticalGridMode = verticalGridRadios.value();
    // No need to call redraw if noLoop is removed, draw() runs automatically
}

// << ADDED: Function to toggle control panel visibility
function toggleControlPanel() {
    isPanelCollapsed = !isPanelCollapsed;
    if (isPanelCollapsed) {
        controlsDiv.addClass('collapsed');
        collapseButton.html('&laquo;'); // Change button text to show arrow pointing left
    } else {
        controlsDiv.removeClass('collapsed');
        collapseButton.html('&raquo;'); // Change button text to show arrow pointing right
    }
    // Adjust canvas size/position after panel collapses/expands
    // We need a slight delay for the CSS transition to start
    setTimeout(windowResized, 350); // Trigger resize logic after transition
}

// << ADDED: Function to toggle all area fills
function toggleAllAreaFills() {
    // Determine the target state: if any are on, turn all off. Otherwise, turn all on.
    let turnOn = !lineSettings.some(line => line.showGradient);

    lineSettings.forEach(line => {
        line.showGradient = turnOn;
        // Update the individual checkbox in the UI
        if (line.gradientCheckboxElement) {
            line.gradientCheckboxElement.checked(turnOn);
        }
    });
    // No redraw needed as draw loop handles it
}

// << ADDED: Function to handle chart type change
function updateChartType() {
    chartType = chartTypeRadios.value();
    let isLineChart = (chartType === 'line');
    let isBarChart = (chartType === 'bar');
    let isMixedChart = (chartType === 'mixed');

    // --- Enable/disable Area Fill controls ---
    lineSettings.forEach(line => {
        // Determine if area fill should be enabled for THIS specific line
        let enableAreaFillForThisLine = false;
        if (isLineChart) {
            enableAreaFillForThisLine = true; // All lines in Line mode
        } else if (isMixedChart && line.ticker !== 'Portfolio') {
            enableAreaFillForThisLine = true; // Benchmark lines in Mixed mode
        }

        if (line.gradientCheckboxElement) line.gradientCheckboxElement.elt.disabled = !enableAreaFillForThisLine;
        if (line.fillOpacityInputElement) line.fillOpacityInputElement.elt.disabled = !enableAreaFillForThisLine;
        if (line.gradientToggleDiv) line.gradientToggleDiv.style('opacity', enableAreaFillForThisLine ? '1' : '0.5');
        if (line.fillOpacityDiv) line.fillOpacityDiv.style('opacity', enableAreaFillForThisLine ? '1' : '0.5');
    });
    // Also update the global toggle button
    toggleAreasButton.elt.disabled = !isLineChart;
    toggleAreasButton.style('opacity', isLineChart ? '1' : '0.5');

    // --- Show/hide Bar Chart Settings ---
    if (isBarChart || isMixedChart) {
        barSettingsGroup.style('display', 'block');
        // Enable/disable Group Gap based on style
        let enableGroupGap = (barDisplayStyle === 'grouped');
        barGroupGapSlider.elt.disabled = !enableGroupGap;
        barGroupGapInput.elt.disabled = !enableGroupGap;
        barGroupGapDiv.style('opacity', enableGroupGap ? '1' : '0.5');
    } else {
        barSettingsGroup.style('display', 'none');
    }

    // Trigger redraw if needed (usually automatic now)
}

// --- Helper function for drawing Line Chart --- 
function drawLinesAndAreaFills(graphX, graphY, graphWidth, graphHeight, minY, maxY, lineFilterFn, disableAreaFill = false) {
    lineSettings.filter(lineFilterFn).forEach(line => { // Filter lines based on provided function
        if (!line.visible || !line.normalizedData || line.normalizedData.length < 2) {
            return; // Skip if not visible or not enough data points to draw a line
        }

        let dataPoints = line.normalizedData;
        let numPoints = dataPoints.length;

        push(); // Isolate styles for this line
        let c = color(line.color);
        c.setAlpha(line.opacity); // Apply opacity (0-255)
        stroke(c);
        strokeWeight(line.stroke);
        noFill(); // Lines should not be filled

        // --- Draw the line stroke itself ---
        beginShape();
        for (let i = 0; i < numPoints; i++) {
            // Map data index to X coordinate
            let x = map(i, 0, numPoints - 1, graphX, graphX + graphWidth);
            // Map normalized data value to Y coordinate
            let y = map(dataPoints[i], minY, maxY, graphY + graphHeight, graphY); // Invert Y-axis for drawing
            vertex(x, y);
        }
        endShape();

        // --- Draw the solid fill area below the line ---
        if (!disableAreaFill && line.showGradient && line.fillOpacity > 0) { // Added disableAreaFill check
            let fillCol = color(line.color); // Get base color
            // Map the 0-100 opacity value to the 0-255 alpha range
            let alphaValue = map(line.fillOpacity, 0, 100, 0, 255);
            fillCol.setAlpha(alphaValue); // Set alpha for the fill using mapped value
            fill(fillCol);
            noStroke(); // No border for the fill area

            beginShape();
            // Start vertex at bottom-left of the graph segment for this line
            let startX = map(0, 0, numPoints - 1, graphX, graphX + graphWidth);
            vertex(startX, graphY + graphHeight);

            // Add vertices along the actual line path
            for (let i = 0; i < numPoints; i++) {
                let x = map(i, 0, numPoints - 1, graphX, graphX + graphWidth);
                let y = map(dataPoints[i], minY, maxY, graphY + graphHeight, graphY); // Invert Y-axis
                vertex(x, y);
            }

            // End vertex at bottom-right of the graph segment
            let endX = map(numPoints - 1, 0, numPoints - 1, graphX, graphX + graphWidth);
            vertex(endX, graphY + graphHeight);

            endShape(CLOSE);
        }

        // Draw hover circle on this line if hovering
        if (isHoveringGraph && hoverIndex !== -1 && hoverIndex < numPoints) {
            let hoverX = map(hoverIndex, 0, numPoints - 1, graphX, graphX + graphWidth);
            let hoverY = map(dataPoints[hoverIndex], minY, maxY, graphY + graphHeight, graphY);
            fill(c); // Use line color for the circle
            noStroke();
            ellipse(hoverX, hoverY, line.stroke * 3 + 4); // Circle size based on stroke
        }

        pop(); // Restore previous styles
    });
} // End of drawLinesAndAreaFills

// --- Helper function for drawing Bar Chart --- ADDED
function drawBars(graphX, graphY, graphWidth, graphHeight, minY, maxY, lineFilterFn) {
    // Filter lines first based on the provided function and visibility/data validity
    let linesToDraw = lineSettings.filter(line => lineFilterFn(line) && line.visible && line.normalizedData && line.normalizedData.length > 0);
    if (linesToDraw.length === 0) return; // No lines match the filter or are drawable

    let numDataPoints = linesToDraw[0].normalizedData.length;
    if (numDataPoints === 0) return;

    let totalAvailableWidthPerPoint = graphWidth / numDataPoints;
    // Calculate gap between groups and width available for bars within a group
    let gapWidth = totalAvailableWidthPerPoint * barGroupGapRatio;
    let groupWidth = totalAvailableWidthPerPoint - gapWidth;

    let numLinesInGroup = linesToDraw.length; // Number of lines being drawn in this group/overlay
    let individualBarWidth = groupWidth; // Default for overlay
    if (barDisplayStyle === 'grouped') {
        individualBarWidth = groupWidth / numLinesInGroup; // Divide group width among lines being drawn
    }

    // Apply the barWidthRatio to the individual bar width
    let finalBarWidth = individualBarWidth * barWidthRatio;
    let intraGroupGap = individualBarWidth * (1.0 - barWidthRatio); // Gap within a group (for grouped bars)

    // Iterate through each data point index (week/month)
    for (let i = 0; i < numDataPoints; i++) {
        let groupStartX = graphX + i * totalAvailableWidthPerPoint + gapWidth / 2;
        let visibleLineIndex = 0; // Keep track for grouped positioning

        // Iterate through *only the lines matching the filter* to draw in consistent order
        linesToDraw.forEach(line => {
            let dataPoints = line.normalizedData;
            push();
            let baseColor = color(line.color);
            baseColor.setAlpha(line.opacity); // Use line opacity for bars
            fill(baseColor);
            noStroke();

            let barX;
            if (barDisplayStyle === 'grouped') {
                // Offset by half the intra-group gap, then by bar widths
                barX = groupStartX + (intraGroupGap / 2) + visibleLineIndex * (finalBarWidth + intraGroupGap);
            } else { // Overlay mode
                barX = groupStartX; // All bars start at the same group position
            }

            let zeroY = map(100, minY, maxY, graphY + graphHeight, graphY); // Y position of the 100% baseline
            let dataY = map(dataPoints[i], minY, maxY, graphY + graphHeight, graphY);
            let barH = zeroY - dataY; // Height relative to baseline (can be negative)

            // Handle hover highlighting
            if (isHoveringGraph && hoverIndex === i) {
                let hoverColor = color(line.color); // Use base color
                hoverColor.setAlpha(255); // Make fully opaque on hover
                fill(hoverColor);
                stroke(200); // Add a white/light border on hover
                strokeWeight(1);
            } else {
                fill(baseColor);
                noStroke();
            }

            // Draw rect from baseline
            // Use finalBarWidth, adjusted for grouping or overlay
            rect(barX, dataY, finalBarWidth, barH);

            pop();
            visibleLineIndex++; // Increment only after processing a visible line
        }); // End forEach linesToDraw
    } // End for i (data points)
} // End of drawBars

// << ADDED: Functions for bar settings updates >>
function updateBarWidth() {
    let valPercent;
    if (this.elt.type === 'range') { // Slider changed
        valPercent = barWidthSlider.value();
        barWidthInput.value(valPercent);
    } else { // Input field changed
        valPercent = parseInt(barWidthInput.value());
        if (!isNaN(valPercent)) {
            barWidthSlider.value(constrain(valPercent, 10, 100)); // Update slider too
        }
    }
    valPercent = constrain(valPercent, 10, 100); // Ensure range 10-100
    barWidthRatio = valPercent / 100.0; // Convert percentage back to ratio 0.1-1.0
}

function updateBarStyle() {
    barDisplayStyle = barStyleRadios.value();
    // Update enabled state of group gap controls
    updateChartType();
}

// << ADDED: Function for group gap updates >>
function updateBarGroupGap() {
    let valPercent;
    if (this.elt.type === 'range') { // Slider changed
        valPercent = barGroupGapSlider.value();
        barGroupGapInput.value(valPercent);
    } else { // Input field changed
        valPercent = parseInt(barGroupGapInput.value());
        if (!isNaN(valPercent)) {
            barGroupGapSlider.value(constrain(valPercent, 0, 50)); // Update slider too
        }
    }
    valPercent = constrain(valPercent, 0, 50); // Ensure range 0-50
    barGroupGapRatio = valPercent / 100.0; // Convert percentage back to ratio 0.0-0.5
}

// << ADDED: Function to update time period mode >>
function updateTimePeriod() {
    const newPeriodMode = timePeriodRadios.value();
    if (newPeriodMode !== timePeriodMode) {
        // Store current visibility states before changing data
        const visibilityStates = {};
        lineSettings.forEach(line => {
            visibilityStates[line.ticker] = line.visible;
        });
        
        // Update time period mode
        timePeriodMode = newPeriodMode;
        
        // Reprocess data to update with the new time period data
        processData();
        
        // Restore visibility states
        lineSettings.forEach(line => {
            if (visibilityStates[line.ticker] !== undefined) {
                line.visible = visibilityStates[line.ticker];
            }
        });
        
        // Recreate controls with preserved visibility states
        createControls();
        redraw();
    }
} //PLACEHOLDER_FOR_REAL_CONTENT
