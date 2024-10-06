function nodeTouches(node, xy) {
    let {left, right, top, bottom} = getNodeBounds(node);
    let [x, y] = xy;
    return left <= x && x <= right && top <= y && y <= bottom;
}

function assumptionTouches(node, xy) {
    let {left, right, top, bottom} = getAssumptionBounds(node);
    let [x, y] = xy;
    return left <= x && x <= right && top <= y && y <= bottom;
}

function getAssumptionBounds(node) {
    let text = postfixToText(node.postfix);
    let textMetrics = ctx.measureText(text);
    let assumptionWidth = textMetrics.width;
    let assumptionHeight = textMetrics.fontBoundingBoxAscent + textMetrics.fontBoundingBoxDescent;
    assumptionWidth = Math.max(assumptionWidth, assumptionHeight);
    let padding = LINE_WIDTH * 2 * UPSCALE;
    let {left, top} = getNodeBounds(node);
    return {left, right: left + assumptionWidth + padding, top, bottom: top + assumptionHeight + padding};
}

function getAssumptionsFor(node) {
    return nodes.filter(x => x && x.type === "assumption" && nodeIsInside(x, node));
}

function intersectsAssumption(node) {
    return nodes.some(x => x && x.type === "assumption" && nodesIntersect(node, x));
}

function connectsToAssumption(node) {
    if (node.input !== undefined && node.input !== null) {
        if (nodes[node.input].type === "assumption" && !getAssumptionsFor(node).some(x => x && x.id === node.input))
            return true;
    } else {
        let i = 1;
        while (node["input" + i] !== undefined) {
            if (node["input" + i] === null) {
                i++;
                continue;
            }
            let otherNode = nodes[node["input" + i]];
            if (otherNode.type === "assumption" && !getAssumptionsFor(node).some(x => x && x.id === otherNode.id))
                return true;
            i++;
        }
    }
}

function getInputs(node) {
    if (!node) return [];
    let inputs = [];
    if (node.input !== undefined) inputs.push(node.input);
    let i = 1;
    while (node["input" + i] !== undefined) {
        inputs.push(node["input" + i]);
        i++;
    }
    return inputs;
}

function isLoop(node) {
    let queue = [node.id];
    while (queue.length) {
        let current = queue.shift();
        queue = queue.concat(getInputs(nodes[current]).filter(x => x !== null));
        if (queue.includes(node.id)) return true;
    }
    return false;
}

function getNodeOutputTo(from, to) {
    let rawOutput = getNodeOutput(from);
    if (!rawOutput) return rawOutput;
    let assumptionsOfFrom = getAssumptionsFor(from);
    let assumptionsOfTo = getAssumptionsFor(to);
    let assumptionsOut = assumptionsOfFrom.filter(x => !assumptionsOfTo.includes(x));
    assumptionsOut.sort((a, b) => getAssumptionsFor(b).length - getAssumptionsFor(a).length);
    for (let a of assumptionsOut)
        rawOutput = [rawOutput, a.postfix, ASSUMING];
    return rawOutput;
}

let cache = {};
function getNodeOutput(node) {
    if (cache[node.id]) return cache[node.id];
    if (isLoop(node) || connectsToAssumption(node)) return cache[node.id] = null;
    switch (node.type) {
        case "premise":
        case "assumption":
            return cache[node.id] = node.postfix;
        case "reiteration":
            return cache[node.id] = (node.input !== null ? getNodeOutputTo(nodes[node.input], node) : null);
        case "conjunctionIntroduction": {
            if (node.input1 === null) return cache[node.id] = null;
            if (node.input2 === null) return cache[node.id] = null;
            let output1 = getNodeOutputTo(nodes[node.input1], node);
            let output2 = getNodeOutputTo(nodes[node.input2], node);
            if (!output1 || !output2) return cache[node.id] = null;
            return cache[node.id] = [output1, output2, AND];
        }
        case "conjunctionEliminationLeft": {
            if (node.input === null) return cache[node.id] = null;
            let output = getNodeOutputTo(nodes[node.input], node);
            return cache[node.id] = (output && output.at(-1) === AND ? output[0] : null);
        }
        case "conjunctionEliminationRight": {
            if (node.input === null) return cache[node.id] = null;
            let output = getNodeOutputTo(nodes[node.input], node);
            return cache[node.id] = (output && output.at(-1) === AND ? output[1] : null);
        }
        case "implicationIntroduction": {
            if (node.input === null) return cache[node.id] = null;
            let output = getNodeOutputTo(nodes[node.input], node);
            return cache[node.id] = (output && output.at(-1) === ASSUMING ? [output[1], output[0], IMPLIES] : null);
        }
        case "implicationElimination": {
            if (node.input1 === null) return cache[node.id] = null;
            if (node.input2 === null) return cache[node.id] = null;
            let output1 = getNodeOutputTo(nodes[node.input1], node);
            let output2 = getNodeOutputTo(nodes[node.input2], node);
            if (!output1 || !output2) return cache[node.id] = null;
            if (output1.at(-1) !== IMPLIES) return cache[node.id] = null;
            if (!postfixEquals(output1[0], output2)) return cache[node.id] = null;
            return cache[node.id] = output1[1];
        }
        case "biconditionalIntroduction": {
            if (node.input1 === null) return cache[node.id] = null;
            if (node.input2 === null) return cache[node.id] = null;
            let output1 = getNodeOutputTo(nodes[node.input1], node);
            let output2 = getNodeOutputTo(nodes[node.input2], node);
            if (!output1 || !output2) return cache[node.id] = null;
            if (output1.at(-1) !== ASSUMING) return cache[node.id] = null;
            if (output2.at(-1) !== ASSUMING) return cache[node.id] = null;
            let psi = output1[0];
            let phi = output1[1];
            if (!postfixEquals(output2[0], phi)) return cache[node.id] = null;
            if (!postfixEquals(output2[1], psi)) return cache[node.id] = null;
            return cache[node.id] = [phi, psi, BICONDITIONAL];
        }
        case "biconditionalEliminationLeft": {
            if (node.input1 === null) return cache[node.id] = null;
            if (node.input2 === null) return cache[node.id] = null;
            let output1 = getNodeOutputTo(nodes[node.input1], node);
            let output2 = getNodeOutputTo(nodes[node.input2], node);
            if (!output1 || !output2) return cache[node.id] = null;
            if (output1.at(-1) !== BICONDITIONAL) return cache[node.id] = null;
            if (!postfixEquals(output1[0], output2)) return cache[node.id] = null;
            return cache[node.id] = output1[1];
        }
        case "biconditionalEliminationRight": {
            if (node.input1 === null) return cache[node.id] = null;
            if (node.input2 === null) return cache[node.id] = null;
            let output1 = getNodeOutputTo(nodes[node.input1], node);
            let output2 = getNodeOutputTo(nodes[node.input2], node);
            if (!output1 || !output2) return cache[node.id] = null;
            if (output1.at(-1) !== BICONDITIONAL) return cache[node.id] = null;
            if (!postfixEquals(output1[1], output2)) return cache[node.id] = null;
            return cache[node.id] = output1[0];
        }
        case "disjunctionIntroductionLeft": {
            if (node.input === null) return cache[node.id] = null;
            let output = getNodeOutputTo(nodes[node.input], node);
            return cache[node.id] = [output, node.other, OR];
        }
        case "disjunctionIntroductionRight": {
            if (node.input === null) return cache[node.id] = null;
            let output = getNodeOutputTo(nodes[node.input], node);
            return cache[node.id] = [node.other, output, OR];
        }
        case "disjunctionElimination": {
            if (node.input1 === null) return cache[node.id] = null;
            if (node.input2 === null) return cache[node.id] = null;
            if (node.input3 === null) return cache[node.id] = null;
            let output1 = getNodeOutputTo(nodes[node.input1], node);
            let output2 = getNodeOutputTo(nodes[node.input2], node);
            let output3 = getNodeOutputTo(nodes[node.input3], node);
            if (!output1 || !output2 || !output3) return cache[node.id] = null;
            if (output1.at(-1) !== OR) return cache[node.id] = null;
            if (output2.at(-1) !== ASSUMING) return cache[node.id] = null;
            if (output3.at(-1) !== ASSUMING) return cache[node.id] = null;
            let phi = output1[0];
            let psi = output1[1];
            if (!postfixEquals(output2[1], phi)) return cache[node.id] = null;
            if (!postfixEquals(output3[1], psi)) return cache[node.id] = null;
            let chi = output2[0];
            if (!postfixEquals(output3[0], chi)) return cache[node.id] = null;
            return cache[node.id] = chi;
        }
        case "negationIntroduction": {
            if (node.input === null) return cache[node.id] = null;
            let output = getNodeOutputTo(nodes[node.input], node);
            if (!output) return cache[node.id] = null;
            if (output.at(-1) !== ASSUMING) return cache[node.id] = null;
            if (!postfixEquals(output[0], CONTRADICTION)) return cache[node.id] = null;
            return cache[node.id] = [output[1], NOT];
        }
        case "negationElimination": {
            if (node.input1 === null) return cache[node.id] = null;
            if (node.input2 === null) return cache[node.id] = null;
            let output1 = getNodeOutputTo(nodes[node.input1], node);
            let output2 = getNodeOutputTo(nodes[node.input2], node);
            if (!output1 || !output2) return cache[node.id] = null;
            if (output2.at(-1) !== NOT) return cache[node.id] = null;
            if (!postfixEquals(output1, output2[0])) return cache[node.id] = null;
            return cache[node.id] = CONTRADICTION;
        }
        case "indirectProof": {
            if (node.input === null) return cache[node.id] = null;
            let output = getNodeOutputTo(nodes[node.input], node);
            if (!output) return cache[node.id] = null;
            if (output.at(-1) !== ASSUMING) return cache[node.id] = null;
            if (!postfixEquals(output[0], CONTRADICTION)) return cache[node.id] = null;
            if (output[1].at(-1) !== NOT) return cache[node.id] = null;
            return cache[node.id] = output[1][0];
        }
        case "explosion":
            return cache[node.id] = (
                node.input === null ? null :
                !postfixEquals(getNodeOutputTo(nodes[node.input], node), CONTRADICTION) ? null :
                node.output
            );
        case "disjunctiveSyllogismLeft": {
            if (node.input1 === null) return cache[node.id] = null;
            if (node.input2 === null) return cache[node.id] = null;
            let output1 = getNodeOutputTo(nodes[node.input1], node);
            let output2 = getNodeOutputTo(nodes[node.input2], node);
            if (!output1 || !output2) return cache[node.id] = null;
            if (output1.at(-1) !== OR) return cache[node.id] = null;
            if (output2.at(-1) !== NOT) return cache[node.id] = null;
            let phi = output1[0];
            let psi = output1[1];
            if (!postfixEquals(output2[0], phi)) return cache[node.id] = null;
            return cache[node.id] = psi;
        }
        case "disjunctiveSyllogismRight": {
            if (node.input1 === null) return cache[node.id] = null;
            if (node.input2 === null) return cache[node.id] = null;
            let output1 = getNodeOutputTo(nodes[node.input1], node);
            let output2 = getNodeOutputTo(nodes[node.input2], node);
            if (!output1 || !output2) return cache[node.id] = null;
            if (output1.at(-1) !== OR) return cache[node.id] = null;
            if (output2.at(-1) !== NOT) return cache[node.id] = null;
            let phi = output1[0];
            let psi = output1[1];
            if (!postfixEquals(output2[0], psi)) return cache[node.id] = null;
            return cache[node.id] = phi;
        }
        case "modusTollens": {
            if (node.input1 === null) return cache[node.id] = null;
            if (node.input2 === null) return cache[node.id] = null;
            let output1 = getNodeOutputTo(nodes[node.input1], node);
            let output2 = getNodeOutputTo(nodes[node.input2], node);
            if (!output1 || !output2) return cache[node.id] = null;
            if (output1.at(-1) !== IMPLIES) return cache[node.id] = null;
            if (output2.at(-1) !== NOT) return cache[node.id] = null;
            let phi = output1[0];
            let psi = output1[1];
            if (!postfixEquals(output2[0], psi)) return cache[node.id] = null;
            return cache[node.id] = [phi, NOT];
        }
        case "doubleNegationElimination": {
            if (node.input === null) return cache[node.id] = null;
            let output = getNodeOutputTo(nodes[node.input], node);
            if (!output) return cache[node.id] = null;
            if (output.at(-1) !== NOT) return cache[node.id] = null;
            if (output[0].at(-1) !== NOT) return cache[node.id] = null;
            return cache[node.id] = output[0][0];
        }
        case "lawOfExcludedMiddle": {
            if (node.input1 === null) return cache[node.id] = null;
            if (node.input2 === null) return cache[node.id] = null;
            let output1 = getNodeOutputTo(nodes[node.input1], node);
            let output2 = getNodeOutputTo(nodes[node.input2], node);
            if (!output1 || !output2) return cache[node.id] = null;
            if (output1.at(-1) !== ASSUMING) return cache[node.id] = null;
            if (output2.at(-1) !== ASSUMING) return cache[node.id] = null;
            let psi = output1[0];
            let phi = output1[1];
            if (!postfixEquals(output2[0], psi)) return cache[node.id] = null;
            if (!postfixEquals(output2[1], [phi, NOT])) return cache[node.id] = null;
            return cache[node.id] = psi;
        }
        case "deMorgansLawParAndOr": {
            if (node.input === null) return cache[node.id] = null;
            let output = getNodeOutputTo(nodes[node.input], node);
            if (!output) return cache[node.id] = null;
            if (output.at(-1) !== NOT) return cache[node.id] = null;
            if (output[0].at(-1) !== AND) return cache[node.id] = null;
            return cache[node.id] = [[output[0][0], NOT], [output[0][1], NOT], OR];
        }
        case "deMorgansLawOrAndPar": {
            if (node.input === null) return cache[node.id] = null;
            let output = getNodeOutputTo(nodes[node.input], node);
            if (!output) return cache[node.id] = null;
            if (output.at(-1) !== OR) return cache[node.id] = null;
            if (output[0].at(-1) !== NOT) return cache[node.id] = null;
            if (output[1].at(-1) !== NOT) return cache[node.id] = null;
            return cache[node.id] = [[output[0][0], output[1][0], AND], NOT];
        }
        case "deMorgansLawParOrAnd": {
            if (node.input === null) return cache[node.id] = null;
            let output = getNodeOutputTo(nodes[node.input], node);
            if (!output) return cache[node.id] = null;
            if (output.at(-1) !== NOT) return cache[node.id] = null;
            if (output[0].at(-1) !== OR) return cache[node.id] = null;
            return cache[node.id] = [[output[0][0], NOT], [output[0][1], NOT], AND];
        }
        case "deMorgansLawAndOrPar": {
            if (node.input === null) return cache[node.id] = null;
            let output = getNodeOutputTo(nodes[node.input], node);
            if (!output) return cache[node.id] = null;
            if (output.at(-1) !== AND) return cache[node.id] = null;
            if (output[0].at(-1) !== NOT) return cache[node.id] = null;
            if (output[1].at(-1) !== NOT) return cache[node.id] = null;
            return cache[node.id] = [[output[0][0], output[1][0], OR], NOT];
        }
        case "output": {
            if (getAssumptionsFor(node).length) return cache[node.id] = null;
            if (node.input === null) return cache[node.id] = null;
            let output = getNodeOutputTo(nodes[node.input], node);
            return cache[node.id] = output;
        }
    }
}

function getNodeText(node) {
    let output = getNodeOutput(node);
    let outputText = output ? postfixToText(output) : "?";
    if (node.type === "premise") return outputText;
    if (node.type === "output") return outputText;
    return getNodeTextHeader(node) + ": " + outputText;
}

function getNodeTextHeader(node) {
    switch (node.type) {
        case "disjunctionIntroductionLeft":
            return OR + "I (" + LEFT + " | " + PSI + " = \"" + postfixToText(node.other) + "\")";
        case "disjunctionIntroductionRight":
            return OR + "I (" + RIGHT + " | " + PSI + " = \"" + postfixToText(node.other) + "\")";
        case "explosion":
            return "X (" + PHI + " = \"" + postfixToText(node.output) + "\")";
        default: return HEADERS[node.type];
    }
}

function getNodeDimensions(node) {
    let labels = LABELS[node.type];
    let text = getNodeText(node);
    let textMetrics = ctx.measureText(text);
    let width = textMetrics.width;
    let height = textMetrics.fontBoundingBoxAscent + textMetrics.fontBoundingBoxDescent;
    width = Math.max(width, height);
    if (labels) {
        height *= labels.left.length;
        let leftLabelWidth = Math.max(...labels.left.map(x => ctx.measureText(x).width)) + LINE_WIDTH * UPSCALE;
        let rightLabelWidth = ctx.measureText(labels.right).width + LINE_WIDTH * UPSCALE;
        width += leftLabelWidth + rightLabelWidth + LINE_WIDTH * 2 * UPSCALE;
    }
    if (node.type === "assumption") {
        width += node.addedWidth;
        height += node.addedHeight;
    }
    return [width + LINE_WIDTH * 2 * UPSCALE, height + LINE_WIDTH * 2 * UPSCALE];
}

function getNodeBounds(node) {
    let [width, height] = getNodeDimensions(node);
    let left = node.x - width / 2;
    if (node.type === "output") left = node.x - width;
    let right = left + width;
    let top = node.y - height / 2;
    let bottom = top + height;
    return {left, right, top, bottom};
}

function nodesOverlap(node1, node2) {
    let {left: left1, right: right1, top: top1, bottom: bottom1} = getNodeBounds(node1);
    let {left: left2, right: right2, top: top2, bottom: bottom2} = getNodeBounds(node2);
    let overlapsX = false;
    if (left1 <= left2 && left2 <= right1) overlapsX = true;
    if (left1 <= right2 && right2 <= right1) overlapsX = true;
    if (left2 <= left1 && left1 <= right2) overlapsX = true;
    if (left2 <= right1 && right1 <= right2) overlapsX = true;
    let overlapsY = false;
    if (top1 <= top2 && top2 <= bottom1) overlapsY = true;
    if (top1 <= bottom2 && bottom2 <= bottom1) overlapsY = true;
    if (top2 <= top1 && top1 <= bottom2) overlapsY = true;
    if (top2 <= bottom1 && bottom1 <= bottom2) overlapsY = true;
    return overlapsX && overlapsY;
}

function nodeIsInside(outer, inner) {
    if (inner.type === "assumption") {
        let {left: oleft, right: oright, top: otop, bottom: obottom} = getNodeBounds(outer);
        let {left: ileft, right: iright, top: itop, bottom: ibottom} = getNodeBounds(inner);
        return oleft <= ileft && iright <= oright && otop <= itop && ibottom <= obottom;
    }
    let {left, right, top, bottom} = getNodeBounds(outer);
    return left <= inner.x && inner.x <= right && top <= inner.y && inner.y <= bottom;
}

function nodesIntersect(node1, node2) {
    if (!nodesOverlap(node1, node2)) return false;
    let {left: left1, right: right1, top: top1, bottom: bottom1} = getNodeBounds(node1);
    let {left: left2, right: right2, top: top2, bottom: bottom2} = getNodeBounds(node2);
    if (left1 <= left2 && right2 <= right1 && top1 <= top2 && bottom2 <= bottom1) return false;
    if (left2 <= left1 && right1 <= right2 && top2 <= top1 && bottom1 <= bottom2) return false;
    return true;
}

function setInputError(error) {
    setInputStatus("ERROR. " + error.message);
}

function setInputStatus(text) {
    document.getElementById("inputStatus").innerText = text;
}

function setProofError(error) {
    setProofStatus("ERROR. " + error);
}

function setProofStatus(text) {
    const proofStatus = document.getElementById("proofStatus");
    if (proofStatus.innerText !== text)
        proofStatus.innerText = text;
}

function updateProofStatus() {
    setProofStatus(getNewProofStatus());
}

function getNewProofStatus() {
    if (nodes.some(x => x && x.type === "premise" && getAssumptionsFor(x).length))
        return "Premise inside assumption";
    if (nodes.some(x => x && x.type === "output" && getAssumptionsFor(x).length))
        return "Output inside assumption";
    if (nodes.some(x => x &&
                        x.type === "output" &&
                        getNodeOutput(x) &&
                        postfixToText(getNodeOutput(x)).includes(ASSUMING)))
        return "Output has assumption operator";
    if (nodes.some(x => x && intersectsAssumption(x)))
        return "Intersecting with assumption";
    if (nodes.some(x => x && connectsToAssumption(x)))
        return "Connecting directly to assumption (use reiteration)";
    if (nodes.some(x => x && x.type === "output" && !getNodeOutput(x)))
        return "Invalid proof";
    return "Valid!";
}

setInterval(updateProofStatus, UPDATE_RATE);

function isValidProof() {
    if (nodes.some(x => x && x.type === "output" && !getNodeOutput(x))) return false;
    if (nodes.some(x => x && intersectsAssumption(x))) return false;
    if (nodes.some(x => x && x.type === "premise" && getAssumptionsFor(x).length)) return false;
    if (nodes.some(x => x && x.type === "output" && getAssumptionsFor(x).length)) return false;
    if (nodes.some(x => x && connectsToAssumption(x))) return false;
    if (nodes.some(x => x &&
                        x.type === "output" &&
                        getNodeOutput(x) &&
                        postfixToText(getNodeOutput(x)).includes(ASSUMING))) return false;
    return true;
}

let nodes = [];
function addNode(node) {
    let [nodeWidth, nodeHeight] = getNodeDimensions(node);
    for (let posX = 0; posX < canvas.width - nodeWidth; posX += 10 * UPSCALE) {
        let result = tryPlacingNode(node, [posX + nodeWidth / 2, nodeHeight / 2]);
        if (result) return result;
    }
    for (let tries = 0; tries < 10; tries++) {
        let x = Math.random() * (canvas.width - nodeWidth) + nodeWidth / 2;
        let y = Math.random() * (canvas.height - nodeHeight) + nodeHeight / 2;
        result = tryPlacingNode(node, [x, y]);
        if (result) return result;
    }
    tryPlacingNode(node, [Math.random() * (canvas.width - nodeWidth) + nodeWidth / 2,
                          Math.random() * (canvas.height - nodeHeight) + nodeHeight / 2], true);
}

function tryPlacingNode(node, xy, override) {
    let positioned = {...node, x: xy[0], y: xy[1]};
    let hasOverlap = false;
    if (!override) {
        for (let otherNode of nodes) {
            if (otherNode && nodesOverlap(positioned, otherNode)) {
                hasOverlap = true;
                break;
            }
        }
        if (hasOverlap) return null;
    }
    let i = 0;
    while (nodes[i]) i++;
    nodes[i] = {
        ...positioned,
        id: i,
        lastTouched: +Date.now()
    };
    return i;
}

function moveNodeTo(node, xy) {
    let [width, height] = getNodeDimensions(node);
    let [x, y] = xy;
    x = Math.min(Math.max(x, width / 2), canvas.width - width / 2);
    y = Math.min(Math.max(y, height / 2), canvas.height - height / 2);
    node.x = x;
    node.y = y;
}

function resizeNode(node, size) {
    let [oldWidth, oldHeight] = [node.addedWidth, node.addedHeight];
    let [width, height] = size.map(x => Math.max(x, 0));
    let newX = node.x - oldWidth / 2 + width / 2;
    let newY = node.y - oldHeight / 2 + height / 2;
    node.addedWidth = width;
    node.addedHeight = height;
    moveNodeTo(node, [newX, newY]);
}

function getHoveredNode() {
    for (let node of nodes.filter(x => x).toSorted((a, b) => b.lastTouched - a.lastTouched)) {
        if (node.type === "assumption" && assumptionTouches(node, mousePos)) return node;
        if (node.type !== "assumption" && nodeTouches(node, mousePos)) return node;
    }
}