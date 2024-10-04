function reset() {
    nodes = [
        {
            type: "output",
            id: 0,
            x: canvas.width,
            y: canvas.height / 2,
            input: null
        }
    ];
    grabbedNode = null;
    arrowStart = null;
    setInputStatus("OK");
}

function getFormula() {
    setInputStatus("OK");
    let text = document.getElementById("formula").value;
    try {
        return textToPostfix(text);
    } catch (e) {
        if (e instanceof SyntaxError) {
            setInputError(e);
            return null;
        } else throw e;
    }
}

function addPremise() {
    let postfix = getFormula();
    if (postfix)
        addPremiseByPostfix(postfix);
}

function addPremiseByPostfix(postfix) {
    return addNode({
        type: "premise",
        postfix
    });
}

function addAssumption() {
    let postfix = getFormula();
    if (postfix)
        addAssumptionByPostfix(postfix);
}

function addAssumptionByPostfix(postfix) {
    return addNode({
        type: "assumption",
        postfix,
        addedWidth: 80 * UPSCALE,
        addedHeight: 60 * UPSCALE
    });
}

function addUnary(type) {
    setInputStatus("OK");
    addNode({type, input: null});
}

function addBinary(type) {
    addNAry(type, 2);
}

function addNAry(type, n) {
    setInputStatus("OK");
    let node = {type};
    for (let i = 1; i <= n; i++) node["input" + i] = null;
    addNode(node);
}

function addDisjunctionIntroduction(isLeft) {
    let postfix = getFormula();
    if (!postfix) return;
    addNode({
        type: "disjunctionIntroduction" + (isLeft ? "Left" : "Right"),
        input: null,
        other: postfix
    });
}

function addExplosion() {
    let postfix = getFormula();
    if (!postfix) return;
    addNode({
        type: "explosion",
        input: null,
        output: postfix
    });
}

let grabbedNode = null;
let grabOffset = null;
let grabbingResizer = false;
function grabNode() {
    grabbingResizer = false;
    let hovered = getHoveredNode();
    if (hovered && hovered.type !== "output") {
        grabbedNode = hovered;
        grabbedNode.lastTouched = +Date.now();
        grabOffset = [mousePos[0] - grabbedNode.x, mousePos[1] - grabbedNode.y];
    } else {
        for (let node of nodes) {
            if (!node) continue;
            if (node.type !== "assumption") continue;
            let {right, bottom} = getNodeBounds(node);
            if (mousePos[0] > right) continue;
            if (mousePos[1] > bottom) continue;
            let distance = Math.sqrt((right - mousePos[0]) ** 2 + (bottom - mousePos[1]) ** 2);
            if (distance < ASSUMPTION_RESIZER_SIZE * UPSCALE) {
                grabbedNode = node;
                grabbedNode.lastTouched = +Date.now();
                grabOffset = [mousePos[0] - grabbedNode.addedWidth, mousePos[1] - grabbedNode.addedHeight];
                grabbingResizer = true;
            }
        }
    }
}

function moveGrabbedNode() {
    if (!grabbedNode) return;
    if (grabbingResizer) {
        resizeNode(grabbedNode, [mousePos[0] - grabOffset[0], mousePos[1] - grabOffset[1]]);
    } else {
        moveNodeTo(grabbedNode, [mousePos[0] - grabOffset[0], mousePos[1] - grabOffset[1]]);
    }
    grabbedNode.lastTouched = +Date.now();
}

function deleteNode() {
    let hovered = getHoveredNode();
    if (hovered && hovered.type !== "output") {
        delete nodes[hovered.id];
        for (let node of nodes) {
            if (!node) continue;
            if (node.input === hovered.id) node.input = null;
            let index = 1;
            while (node["input" + index] !== undefined) {
                if (node["input" + index] === hovered.id) node["input" + index] = null;
                index++;
            }
        }
    } else {
        for (let node of nodes) {
            if (!node) continue;
            if (node.input !== undefined) {
                if (node.input === null) continue;
                let from = nodes[node.input];
                let {right, top: ftop, bottom: fbottom} =
                    from.type === "assumption" ? getAssumptionBounds(from) : getNodeBounds(from);
                let start = [right, (ftop + fbottom) / 2];
                let {left, top, bottom} = getNodeBounds(node);
                let end = [left, (bottom - top) / 2 + top];
                let circleCenter = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2];
                let distance = Math.sqrt((mousePos[0] - circleCenter[0]) ** 2 + (mousePos[1] - circleCenter[1]) ** 2);
                if (distance < 10 * UPSCALE) {
                    node.input = null;
                    break;
                }
            } else if (node.input1 !== undefined) {
                let index = 1;
                let done = false;
                while (node["input" + index] !== undefined) {
                    if (node["input" + index] === null) {
                        index++;
                        continue;
                    }
                    let from = nodes[node["input" + index]];
                    let {right} = getNodeBounds(from);
                    let start = [right, from.y];
                    let {left, top, bottom} = getNodeBounds(node);
                    let end = [left, ((index - 0.5) / LABELS[node.type].left.length) * (bottom - top) + top];
                    let circleCenter = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2];
                    let distance = Math.sqrt((mousePos[0] - circleCenter[0]) ** 2 + (mousePos[1] - circleCenter[1]) ** 2);
                    if (distance < 10 * UPSCALE) {
                        node["input" + index] = null;
                        done = true;
                        break;
                    }
                    index++;
                }
                if (done) break;
            }
        }
    }
}

function connectInput(destination, source) {
    let numInputs;
    if (destination.type === "output") numInputs = 1;
    else {
        let labels = LABELS[destination.type];
        if (!labels) return;
        numInputs = labels.left.length;
    }
    let {top: yTop, bottom: yBottom} = getNodeBounds(destination);
    let y = mousePos[1];
    let u = (y - yTop) / (yBottom - yTop);
    let index = Math.floor(u * numInputs);
    let sourceIndex = source.id;
    if (numInputs === 1)
        destination.input = sourceIndex;
    else
        destination["input" + (index + 1)] = sourceIndex;
}

let arrowStart = null;
function update() {
    if (mouseIsDown) {
        moveGrabbedNode();
        cache = {};
    } else {
        grabbedNode = null;
    }
    if (mouseIsDownThisFrame) {
        if (arrowStart) {
            let hovered = getHoveredNode();
            if (hovered) {
                connectInput(hovered, arrowStart);
                cache = {};
            }
            arrowStart = null;
        } else if (mouseLastClickWasShift) {
            let hovered = getHoveredNode();
            if (hovered && hovered.type !== "output") arrowStart = hovered;
        } else grabNode();
    }
    if (mouseRightClickedThisFrame) {
        deleteNode();
        cache = {};
    }
    updateProofNode();
    mouseIsDownThisFrame = false;
    mouseRightClickedThisFrame = false;
}

function updateProofNode() {
    const proofDiv = document.getElementById("proof");
    let currentText = proofDiv.innerText;
    let newText = getProofNodeText();
    if (currentText !== newText)
        proofDiv.innerText = newText;
}

function getProofNodeText() {
    if (!isValidProof()) {
        return "Proof is invalid";
    } else {
        return stringifyProof(getProof());
    }
}

reset();
setInterval(update, UPDATE_RATE);