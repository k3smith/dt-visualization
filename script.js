const X = [1, 3, 4, 7, 9, 10, 11, 13, 14, 16];
const Y = [3, 4, 3, 15, 17, 15, 18, 7, 3, 4];
let y_pred = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

// Helper functions

function linspace(start, end, numPoints) {
    const step = (end - start) / (numPoints - 1);
    console.log(numPoints)
    return Array.from({ length: numPoints }, (v, i) => start + i * step);
}

function calcMSE(y, y_pred) {
    if (y.length !== y_pred.length) {
        throw new Error('Arrays y and y_pred must have the same length');
    }

    const n = y.length;
    let sumSqError = 0;

    for (let i = 0; i < n; i++) {
        const error = y_pred[i] - y[i];
        sumSqError += error * error;
    }
    if (n === 0) {
        return 0;
    } else {
        return sumSqError / n;
    }
}

function calcRMSE(y, y_pred) {
    const mse = calcMSE(y, y_pred);
    return Math.sqrt(mse);
}

function sumIf(y, filter) {
    if (y.length !== filter.length) {
        throw new Error('Arrays y and filter must have the same length');
    }

    let sum = 0;
    for (let i = 0; i < y.length; i++) {
        if (filter[i]) {
            sum += y[i];
        }
    }
    return sum;
}

function countIf(filter) {
    return filter.reduce((count, f) => count + (f ? 1 : 0), 0);
}

function averageIf(y, filter) {
    const sum = sumIf(y, filter);
    const count = countIf(filter);
    return sum / count;
}

function average(y) {
    if (count(y) === 0) {
        return 0;
    } else {
        return sum(y) / count(y);
    }
}

function assignAverage(arr) {
    if (arr.length === 0) return []; // Handle empty array

    // Calculate the average
    const average = sum(arr) / arr.length;

    // Assign the average to every element in the array
    return arr.map(() => average);
}

function sum(y) {
    return y.reduce((acc, i) => acc + i, 0);
}

function count(y) {
    return y.reduce((acc, i) => acc + 1, 0);
}

function calcPossibleSplits(x) {
    const splits = [];
    for (let i = 0; i < x.length - 1; i++) {
        splits.push((x[i] + x[i + 1]) / 2);
    }
    return splits;
}

function calcYPred(x, y, split) {
    const filter_1 = x.map(v_x => v_x < split);
    const a_1 = averageIf(y, filter_1);

    const filter_2 = x.map(v_x => v_x >= split);
    const a_2 = averageIf(y, filter_2);

    const values = x.map(v_x => (v_x < split ? a_1 : a_2));
    return values;
}

const margin = { top: window.innerHeight/8, right: window.innerWidth/4, bottom: window.innerHeight/8, left: window.innerWidth/4 };
const width = window.innerWidth - margin.right - margin.left;
const height = window.innerHeight / 3 - margin.top - margin.bottom;

class TreeNode {
    constructor(type, threshold, leftChild, rightChild, values, actual, data, parent) {
        this.type = type;
        this.threshold = threshold;
        this.leftChild = leftChild;
        this.rightChild = rightChild;
        this.values = values;
        this.actual = actual;
        this.data = data;
        this.isSelected = false;
        this.parent = parent;
        this.currentThreshold = threshold;
        this.isExpanded = false; // New property to track if the node has been expanded
    }

    updateThreshold(newThreshold) {
        this.threshold = newThreshold;
        this.currentThreshold = newThreshold;

        // Recalculate left and right children based on new threshold
        this.leftChild.values = this.values.filter((_, i) => this.data[i] <= newThreshold);
        this.leftChild.actual = this.actual.filter((_, i) => this.data[i] <= newThreshold);
        this.leftChild.data  = this.data.filter(v => v <= newThreshold);

        this.rightChild.values = this.values.filter((_, i) => this.data[i] > newThreshold);
        this.rightChild.actual = this.actual.filter((_, i) => this.data[i] > newThreshold);
        this.rightChild.data = this.data.filter(v => v > newThreshold);

        y_pred = findRoot(this).predict();
        this.values = this.predict();
        if (this.values.length === 0) {
            this.rmse = 0;
        } else {
            this.rmse = calcRMSE(this.actual, this.values);
        }        
    }

    deleteLayer() {
        this.type = 'leaf';
        this.leftChild = null;
        this.rightChild = null;
        this.isExpanded = false;
    }

    addLayer() {
        this.type = 'internal';
        this.leftChild = new TreeNode(
            'leaf',
            0,
            null,
            null,
            this.values.filter((_, i) => this.data[i] <= this.currentThreshold),
            this.actual.filter((_, i) => this.data[i] <= this.currentThreshold),
            this.data.filter(v => v <= this.currentThreshold),
            this
        );
        this.rightChild = new TreeNode(
            'leaf',
            0,
            null,
            null,
            this.values.filter((_, i) => this.data[i] > this.currentThreshold),
            this.actual.filter((_, i) => this.data[i] > this.currentThreshold),
            this.data.filter(v => v > this.currentThreshold),
            this
        );
        this.isExpanded = true; // Mark this node as expanded
    }

    calcRMSE() {
        if (this.values.length === 0) {
            return 0;
        } else {
            return calcRMSE(this.values, this.actual);
        }
    }

    predict() {
        if (this.type === 'leaf') {
            return assignAverage(this.actual);
        } else {
            return [
                ...this.leftChild.predict(),
                ...this.rightChild.predict()
            ];
        }
    }
}

function findRoot(node) {
    if (!node) {
        return null;
    }

    while (node.parent !== null) {
        node = node.parent;
    }

    return node;
}

let treeRoot = new TreeNode("leaf", 8.5, null, null, y_pred, Y, X, null);

function tree2data(treeData, data, level = 0) {
    if (!treeData.parent) {
        data.name = 'root';
        data.children = [];
        data.treeNode = treeData;
        data.level = level;
        data.y_pred = treeData.predict(); // Update y_pred based on predictions
    }

    if (treeData.leftChild) {
        const leftChildNodeName = `L${level}`;
        findAndAppendChild(data, treeData.leftChild.parent, {
            name: leftChildNodeName,
            children: [],
            treeNode: treeData.leftChild,
            level: level + 1
        });
        tree2data(treeData.leftChild, data, level + 1);
    }

    if (treeData.rightChild) {
        const rightChildNodeName = `R${level}`;
        findAndAppendChild(data, treeData.rightChild.parent, {
            name: rightChildNodeName,
            children: [],
            treeNode: treeData.rightChild,
            level: level + 1
        });
        tree2data(treeData.rightChild, data, level + 1);
    }
    return data;
}

function findAndAppendChild(parent, parentId, child) {
    if (parent.treeNode === parentId) {
        parent.children.push(child);
        return true;
    }

    for (let i = 0; i < parent.children.length; i++) {
        if (findAndAppendChild(parent.children[i], parentId, child)) {
            return true;
        }
    }

    return false;
}

let data = {};
data = tree2data(treeRoot, data, 0);

const marginTop = margin.top;
const marginRight = margin.right;
const marginLeft = margin.left;

let root = d3.hierarchy(data);
const dx = 80;
const dy = 160;
const rad = 10;

const tree = d3.tree().nodeSize([dx, dy]);
const diagonal = d3.linkHorizontal().x(d => d.y).y(d => d.x);

const svg = d3.select("#tree").append("svg")
    .attr("id", "tree-svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .attr("viewBox", [-margin.left, -margin.top, width + margin.left + margin.right, height + margin.top + margin.bottom])
    .attr("preserveAspectRatio", "xMidYMid meet");

const gSlider = svg.append("g")
    .attr("class", "sliders")
    .attr("transform", "translate(" + 0*margin.right + "," + 1.5*margin.bottom + ")");

const gLink = svg.append("g")
    .attr("fill", "none")
    .attr("stroke", "#555")
    .attr("stroke-opacity", 0.4)
    .attr("stroke-width", 3);

const gNode = svg.append("g")
    .attr("cursor", "pointer")
    .attr("pointer-events", "all");

const svgContainer = document.getElementById("plot");
const widthSVG = window.innerWidth*0.5;
const heightSVG = window.innerHeight*0.3;

console.log(heightSVG)

const scatterPlot = d3.select("#plot").append("svg")
    .attr("class", "scatterplot")
    .attr("width", widthSVG)
    .attr("height", heightSVG)
    .attr("viewBox", `-20 -20 ${widthSVG} ${heightSVG}`)
    .attr("preserveAspectRatio", "xMidYMid meet");
    
const xScale = d3.scaleLinear()
    .domain([-1, d3.max(X)+1])
    .range([0, widthSVG / 2]);

const yScale = d3.scaleLinear()
    .domain([0, d3.max(X)+2])
    .range([heightSVG / 4, 0]);

scatterPlot.append("g")
    .attr("transform", "translate(0," + heightSVG / 4 + ")")
    .call(d3.axisBottom(xScale));

scatterPlot.append("g")
    .call(d3.axisLeft(yScale));

scatterPlot.selectAll(".dot")
    .data(Y)
    .enter().append("circle")
    .attr("class", "dot")
    .attr("cx", (d, i) => xScale(X[i]))
    .attr("cy", d => yScale(d))
    .attr("r", 3)
    .style("fill", "blue");

scatterPlot.selectAll(".dot-pred")
    .data(y_pred)
    .enter().append("circle")
    .attr("class", "dot-pred")
    .attr("cx", (d, i) => xScale(X[i]))
    .attr("cy", d => yScale(d))
    .attr("r", 3)
    .style("fill", "red");

const slider = d3.select("#active-node-section").append("input")
    .attr("id", "threshold-slider")
    .attr("type", "range")
    .attr("min", Math.min(...X)) // Assuming X is your data range
    .attr("max", Math.max(...X))
    .attr("step", 0.1)
    .attr("value", treeRoot.currentThreshold)
    .on("input", function(event) {
        if (activeNode) {
            const threshold = +this.value;
            console.log('From slider', threshold)
            // Update plot and RMSE calculation
            updateRMSEPlot(activeNode, threshold);

            console.log(activeNode)
            // Reset theshold to slider value
            activeNode.data.treeNode.updateThreshold(threshold);
            updateThresholdLine(threshold);
            
            // Optionally update tree visualization based on new threshold
            update(event, activeNode);
        }
    })
    // Optional: Handle change event separately if needed
    .on("change", function(event) {
        if (activeNode) {
            // Update plot and RMSE calculation
            const threshold = +this.value;
            //updateRMSEPlot(activeNode, threshold);
            // Reset theshold to slider value
            activeNode.data.treeNode.updateThreshold(threshold);
            updateThresholdLine(threshold);
            update(event, activeNode);

        }
    });

// Define a variable to hold the active node
let activeNode = null;
let xScaleRMSE;
let yScaleRMSE;

// Function to create or update the threshold slider
function updateActiveNode(activeNode) {
    // Update plot and RMSE calculation
    console.log('From active node:', d3.select("#threshold-slider").attr("value"))
    updateRMSEPlot(activeNode, +(d3.select("#threshold-slider").attr("value")));
}

// Function to update RMSE plot
function updateRMSEPlot(activeNode, valueThreshold) {
    console.log(valueThreshold)
    // Calculate RMSE for all possible thresholds
    const possibleThresholds = linspace(Math.min(...X)+1, Math.max(...X)-1, X.length*3);//calcPossibleSplits(X);
    const rmseValues = possibleThresholds.map(threshold => {
        
        activeNode.data.treeNode.updateThreshold(threshold);
        return activeNode.data.treeNode.rmse;
    });

    // Update or create RMSE plot
    const margin = { top: 100, right: 100, bottom: 100, left: 100 };
    
    const widthSVG = window.innerWidth*0.4;
    const heightSVG = window.innerHeight*0.4;

    xScaleRMSE = d3.scaleLinear()
        .domain([Math.min(...possibleThresholds)-1, Math.max(...possibleThresholds)+1])
        .range([0, widthSVG]);

    yScaleRMSE = d3.scaleLinear()
        .domain([0, d3.max(rmseValues)])
        .range([heightSVG / 2, 0]);

    const line = d3.line()
        .x(d => xScaleRMSE(d.threshold))
        .y(d => yScaleRMSE(d.rmse));

    d3.select("#rmse-plot-svg").remove(); // Clear existing plot if any

    const svg = d3.select("#rmse-plot")
        .append("svg")
        .attr("id", "rmse-plot-svg")
        .attr("width", widthSVG)
        .attr("height", heightSVG)
        .attr("viewBox", `-30 -30 ${widthSVG+90} ${heightSVG}`)
        .append("g")
    console.log(rmseValues)
    console.log(possibleThresholds)
    console.log(line)
    svg.append("path")
        .datum(rmseValues.map((rmse, i) => ({ threshold: possibleThresholds[i], rmse })))
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 1.5)
        .attr("d", line);

    // Append new line at the threshold position
    svg.append("line")
        .attr("id", "threshold-line")
        .attr("x1", xScaleRMSE(valueThreshold)) // Adjust x1 position as needed based on your scale
        .attr("y1", 0)
        .attr("x2", xScaleRMSE(valueThreshold)) // Adjust x2 position as needed based on your scale
        .attr("y2", heightSVG / 2) // Adjust y2 position as needed based on your plot height
        .style("stroke", "red")
        .style("stroke-width", 2)
        .style("stroke-dasharray", "5,5"); // Optional: Add dashed styling

    svg.append("text")
        .attr("id", "threshold-label")
        .attr("x", xScaleRMSE(valueThreshold)) // Adjust x1 position as needed based on your scale
        .attr("y", 0)
        .style("margin-left", "10px") // Adjust margin as needed
        .text(`Threshold: ${valueThreshold.toFixed(2)}`);

    svg.append("g")
        .attr("transform", `translate(0,${heightSVG / 2})`)
        .call(d3.axisBottom(xScaleRMSE));

    svg.append("g")
        .call(d3.axisLeft(yScaleRMSE));
}

function updateThresholdLine(threshold) {
    d3.select("#threshold-line")
        .attr("x1", xScaleRMSE(threshold))
        .attr("x2", xScaleRMSE(threshold))

        d3.select("#threshold-label")
        .attr("x", xScaleRMSE(threshold))
        .text(`Threshold: ${threshold.toFixed(2)}`);
}

function update(event, source) {
    const duration = 250;
    const transition = svg.transition().duration(duration).tween("resize", window.ResizeObserver ? null : () => () => svg.dispatch("toggle"));

    let nodes = root.descendants().reverse();
    console.log(nodes)
    const links = root.links();

    tree(root);

    const node = gNode.selectAll("g")
        .data(nodes, d => d.id);

    const nodeEnter = node.enter().append("g")
    .attr("transform", d => `translate(${source.y0},${source.x0})`)
    .attr("fill-opacity", 0)
    .attr("stroke-opacity", 0)
    .on("dblclick", (event, d) => {
        if (!d.data.treeNode.isExpanded) {
            d.data.treeNode.addLayer();
            d.children = d.children ? null : d._children;
            data = {};
            data = tree2data(findRoot(d.data.treeNode), data, 0);
            root = d3.hierarchy(data);
            update(event, d);
        } else {
            d.data.treeNode.deleteLayer();
            data = tree2data(findRoot(d.data.treeNode), data, 0);
            data = {};
            d.children = d.children ? null : d._children;
            update(event, d);
        }
    }).on("click", (event, d) => {
        if (d.data.treeNode.type === "internal") {
            // Update active node
            activeNode = d;

            // Remove active class from all nodes
            d3.selectAll(".node").classed("active", false);
            // Add or remove class on the clicked element
            d3.select(event.currentTarget).classed("active", true);
            
            slider.attr("value", activeNode.data.treeNode.currentThreshold);
            
            // Update the visualization
            updateActiveNode(activeNode); // Function to update active node section
            //update(event, d); // Function to update tree structure
        }
    });

    nodeEnter.append("circle")
        .attr("r", rad)
        .attr("stroke-width", 10);

    let texts = nodeEnter.append("text")
        .attr("dy", "0.31em")
        .attr("x", d => d._children ? -6 : 6)
        .attr("text-anchor", d => d._children ? "end" : "start")
        .attr("stroke-linejoin", "round")
        .attr("stroke-width", 3)
        .attr("stroke", "white")
        .attr("paint-order", "stroke");

    const nodeUpdate = node.merge(nodeEnter).transition(transition)
        .attr("transform", d => `translate(${d.y},${d.x})`)
        .attr("fill-opacity", 1)
        .attr("stroke-opacity", 1);
    
    nodeUpdate.select("text")
        .attr("x", d => d._children ? -6 : 6)
        .attr("text-anchor", d => d._children ? "end" : "start")
        .text(d => {console.log(`${d.data.name} [${d.data.treeNode.data}]`); return `${d.data.name} [${d.data.treeNode.data}]`});

    const nodeExit = node.exit().transition(transition).remove()
        .attr("transform", d => `translate(${source.y},${source.x})`)
        .attr("fill-opacity", 0)
        .attr("stroke-opacity", 0);

    const link = gLink.selectAll("path")
        .data(links, d => d.target.id);

    const linkEnter = link.enter().append("path")
        .attr("d", d => {
            const o = { x: source.x0, y: source.y0 };
            return diagonal({ source: o, target: o });
        });

    link.merge(linkEnter).transition(transition)
        .attr("d", diagonal);

    link.exit().transition(transition).remove()
        .attr("d", d => {
            const o = { x: source.x, y: source.y };
            return diagonal({ source: o, target: o });
        });

    root.eachBefore(d => {
        d.x0 = d.x;
        d.y0 = d.y;
    });
    
    // Update node classes
    d3.selectAll(".node")
        .classed("active", d => d === activeNode); // Add active class to activeNode


    // Update scatter plot
    scatterPlot.selectAll(".dot-pred")
        .data(y_pred)
        .join("circle")
        .attr("class", "dot-pred")
        .attr("cx", (d, i) => xScale(X[i]))
        .attr("cy", d => yScale(d))
        .attr("r", 3)
        .style("fill", "red");
}

root.x0 = dy / 2;
root.y0 = 0;
root.descendants().forEach((d, i) => {
    d.id = i;
    d._children = d.children;
});

update(null, root);
