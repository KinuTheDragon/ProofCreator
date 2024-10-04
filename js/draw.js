function draw() {
    ctx.fillStyle = "#888";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 5 * UPSCALE;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
    for (let node of nodes.filter(x => x).toSorted((a, b) => a.lastTouched - b.lastTouched))
        drawNode(node);
    drawCurrentArrow();
    for (let node of nodes.filter(x => x)) drawIncomingArrows(node);
}

function drawNode(node) {
    switch (node.type) {
        case "premise":
            drawTextNode(node, "#0cc");
            break;
        case "assumption":
            drawAssumption(node);
            break;
        case "output":
            drawTextNode(node, "#f80");
            break;
        default:
            drawTextNode(node, "#000");
            break;
    }
}

function drawAssumption(node) {
    let text = postfixToText(node.postfix);
    let padding = LINE_WIDTH * 2 * UPSCALE;
    let {left: rectLeft, right: rectRight, top: rectTop, bottom: rectBottom} = getNodeBounds(node);
    let rectWidth = rectRight - rectLeft - padding;
    let rectHeight = rectBottom - rectTop - padding;
    let rect = [rectLeft, rectTop, rectWidth + padding, rectHeight + padding];
    let {left: assumptionLeft, right: assumptionRight,
         top: assumptionTop, bottom: assumptionBottom} = getAssumptionBounds(node);
    let assumptionWidth = assumptionRight - assumptionLeft - padding;
    let assumptionHeight = assumptionBottom - assumptionTop - padding;
    let assumptionRect = [assumptionLeft, assumptionTop, assumptionWidth + padding, assumptionHeight + padding];
    // Yellow background for assumption
    ctx.fillStyle = "#ff0";
    ctx.fillRect(...assumptionRect);
    // Text
    ctx.fillStyle = "#000";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
        text,
        assumptionLeft + assumptionWidth / 2 + padding / 2,
        assumptionTop + assumptionHeight / 2 + padding / 2
    );
    // Outline for assumption
    ctx.strokeStyle = "#000";
    if (intersectsAssumption(node)) ctx.strokeStyle = "#f00";
    ctx.lineWidth = LINE_WIDTH * UPSCALE;
    ctx.strokeRect(...assumptionRect);
    // Full outline
    ctx.strokeRect(...rect);
    // Resizer
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.moveTo(rectRight, rectBottom);
    ctx.lineTo(rectRight - ASSUMPTION_RESIZER_SIZE * UPSCALE, rectBottom);
    ctx.arc(rectRight, rectBottom, ASSUMPTION_RESIZER_SIZE * UPSCALE, Math.PI, 1.5 * Math.PI);
    ctx.lineTo(rectRight, rectBottom - ASSUMPTION_RESIZER_SIZE * UPSCALE);
    ctx.closePath();
    ctx.fill();
}

function drawTextNode(node, outlineColor) {
    let labels = LABELS[node.type];
    let isOutput = node.type === "output";
    ctx.strokeStyle = outlineColor;
    if (intersectsAssumption(node) || (["premise", "output"].includes(node.type) && getAssumptionsFor(node).length))
        ctx.strokeStyle = "#f00";
    else if (node.type !== "output" && !getNodeOutput(node))
        ctx.strokeStyle = "#800";
    ctx.lineWidth = LINE_WIDTH * UPSCALE;
    let [rectWidth, rectHeight] = getNodeDimensions(node);
    let text = getNodeText(node);
    let width = rectWidth - LINE_WIDTH * 2 * UPSCALE;
    let height = rectHeight - LINE_WIDTH * 2 * UPSCALE;
    let rectX = node.x - width / 2 - LINE_WIDTH * UPSCALE;
    if (isOutput) rectX -= width / 2 + LINE_WIDTH * UPSCALE;
    let rectY = node.y - height / 2 - LINE_WIDTH * UPSCALE;
    ctx.fillStyle = "#fff";
    ctx.fillRect(rectX, rectY, rectWidth, rectHeight);
    ctx.fillStyle = "#000";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    let textXOffset = 0;
    if (labels) {
        let leftLabelWidth = Math.max(...labels.left.map(x => ctx.measureText(x).width)) + LINE_WIDTH * UPSCALE;
        let rightLabelWidth = ctx.measureText(labels.right).width + LINE_WIDTH * UPSCALE;
        textXOffset = (leftLabelWidth - rightLabelWidth) / 2;
        let leftLineX = node.x - width / 2 + leftLabelWidth;
        let rightLineX = node.x + width / 2 - rightLabelWidth;
        ctx.beginPath();
        ctx.moveTo(leftLineX, rectY);
        ctx.lineTo(leftLineX, rectY + rectHeight);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(rightLineX, rectY);
        ctx.lineTo(rightLineX, rectY + rectHeight);
        ctx.stroke();
        ctx.fillStyle = "#888";
        ctx.textAlign = "left";
        for (let i = 0; i < labels.left.length; i++) {
            let textMetrics = ctx.measureText(labels.left[i]);
            let height = textMetrics.fontBoundingBoxAscent + textMetrics.fontBoundingBoxDescent;
            ctx.fillText(
                labels.left[i],
                node.x - width / 2,
                node.y - height / 2 * (labels.left.length - 1) + height * i
            );
        }
        ctx.textAlign = "right";
        ctx.fillText(labels.right, node.x + width / 2, node.y);
    } else if (isOutput) textXOffset = -width / 2 - LINE_WIDTH * UPSCALE;
    ctx.fillStyle = "#000";
    ctx.textAlign = "center";
    ctx.fillText(text, node.x + textXOffset, node.y);
    ctx.strokeRect(rectX, rectY, rectWidth, rectHeight);
}

function drawCurrentArrow() {
    if (arrowStart === null) return;
    let start;
    if (arrowStart.type === "assumption") {
        let {top, right, bottom} = getAssumptionBounds(arrowStart);
        start = [right, (top + bottom) / 2];
    } else {
        start = [getNodeBounds(arrowStart).right, arrowStart.y];
    }
    drawArrow(start, mousePos, false);
}

function drawIncomingArrows(node) {
    let labels = LABELS[node.type];
    if (node.type !== "output" && !labels) return;
    let numInputs = node.type === "output" ? 1 : labels.left.length;
    if (numInputs === 1) {
        if (node.input !== null)
            drawArrowBetweenNodes(nodes[node.input], node, 0, numInputs);
    } else {
        for (let i = 0; i < numInputs; i++) {
            let key = "input" + (i + 1);
            if (node[key] !== null) drawArrowBetweenNodes(nodes[node[key]], node, i, numInputs);
        }
    }
}

function drawArrowBetweenNodes(from, to, toIndex, toInputCount) {
    let start;
    if (from.type === "assumption") {
        let {top, right, bottom} = getAssumptionBounds(from);
        start = [right, (top + bottom) / 2];
    } else {
        let {right} = getNodeBounds(from);
        start = [right, from.y];
    }
    let {left, top, bottom} = getNodeBounds(to);
    let end = [left, ((toIndex + 0.5) / toInputCount) * (bottom - top) + top];
    drawArrow(start, end, true);
}

function drawArrow(from, to, hasCircle) {
    let vector = [to[0] - from[0], to[1] - from[1]];
    let vectorLength = Math.sqrt(vector[0] ** 2 + vector[1] ** 2);
    let unitVector = vector.map(x => x / vectorLength);
    let angle = Math.PI - Math.atan2(unitVector[1], unitVector[0]);
    let leftAngle = angle + Math.PI / 4;
    let leftVector = [Math.cos(leftAngle), -Math.sin(leftAngle)].map(x => x * 10 * UPSCALE);
    let leftFlarePoint = [to[0] + leftVector[0], to[1] + leftVector[1]];
    let rightAngle = angle - Math.PI / 4;
    let rightVector = [Math.cos(rightAngle), -Math.sin(rightAngle)].map(x => x * 10 * UPSCALE);
    let rightFlarePoint = [to[0] + rightVector[0], to[1] + rightVector[1]];
    ctx.strokeStyle = "#0f0";
    ctx.lineWidth = 2 * UPSCALE;
    ctx.beginPath();
    ctx.moveTo(...from);
    ctx.lineTo(...to);
    ctx.stroke();
    ctx.beginPath();
    ctx.lineTo(...leftFlarePoint);
    ctx.lineTo(...to);
    ctx.lineTo(...rightFlarePoint);
    ctx.stroke();
    if (hasCircle) {
        ctx.strokeStyle = "#800";
        ctx.beginPath();
        ctx.arc((from[0] + to[0]) / 2, (from[1] + to[1]) / 2, 10 * UPSCALE, 0, 2 * Math.PI);
        ctx.stroke();
    }
}

setInterval(draw, UPDATE_RATE);