function getProof() {
    if (!isValidProof()) return null;
    let proof = [{type: "header", text: getHeader()}];
    let nodeLines = {};
    let proofLineNumber = 1;
    for (let premise of getPremises()) {
        nodeLines[premise.id] = proofLineNumber++;
        proof.push({
            type: "deduction",
            text: postfixToText(getNodeOutput(premise)),
            justification: "PR",
            lineNumber: nodeLines[premise.id]
        });
    }
    proof.push({type: "separator"});
    let assumptionStack = [];
    for (let deduction of getDeductions()) {
        while (assumptionStack.length && !nodeIsInside(nodes[assumptionStack.at(-1)], deduction)) {
            assumptionStack.pop();
            proof.push({type: "dedent"});
        }
        if (deduction.type === "assumption") {
            nodeLines[deduction.id] = proofLineNumber++;
            proof.push({type: "indent"});
            proof.push({
                type: "deduction",
                text: postfixToText(getNodeOutput(deduction)),
                justification: "AS",
                lineNumber: nodeLines[deduction.id]
            });
            proof.push({type: "separator"});
            assumptionStack.push(deduction.id);
            continue;
        }
        for (let a of getAssumptionsFor(deduction).toSorted(x => getAssumptionsFor(x).length)) {
            if (assumptionStack.includes(a.id)) continue;
            nodeLines[a.id] = proofLineNumber++;
            proof.push({type: "indent"});
            proof.push({
                type: "deduction",
                text: postfixToText(getNodeOutput(a)),
                justification: "AS",
                lineNumber: nodeLines[a.id]
            });
            proof.push({type: "separator"});
            assumptionStack.push(a.id);
        }
        nodeLines[deduction.id] = proofLineNumber++;
        proof.push({
            type: "deduction",
            text: postfixToText(getNodeOutput(deduction)),
            justification: JUSTIFICATIONS[deduction.type] + ", " + getCitation(deduction, nodeLines, [...proof]),
            lineNumber: nodeLines[deduction.id],
            assumptions: [...assumptionStack]
        });
    }
    let lastWasDedent = false;
    let spaced = [];
    for (let line of proof) {
        if (lastWasDedent && line.type === "indent")
            spaced.push({type: "spacer"});
        spaced.push(line);
        lastWasDedent = line.type === "dedent";
    }
    return spaced;
}

function stringifyProof(proof) {
    let lines = [];
    let indentCount = 0;
    for (let line of proof) {
        switch (line.type) {
            case "header":
                lines.push(line.text);
                break;
            case "separator":
                lines.push(" " + VERT.repeat(indentCount) + FORK);
                break;
            case "deduction":
                lines.push(line.lineNumber + VERT.repeat(indentCount + 1) + line.text + "\t" + line.justification);
                break;
            case "indent":
                indentCount++;
                break;
            case "dedent":
                indentCount--;
                break;
            case "spacer":
                lines.push(" " + VERT.repeat(indentCount + 1));
                break;
        }
    }
    let paddings = lines.map(x => [x, new RegExp("[" + FORK + VERT + "]").exec(x)?.index]);
    let maxPadding = Math.max(...paddings.map(([x, p]) => p).filter(p => p !== undefined));
    let padded = paddings.map(([x, p]) => " ".repeat(maxPadding - p) + x);
    let rightPaddings = padded.map(x => [x, x.indexOf("\t")]);
    let maxRightPadding = Math.max(...rightPaddings.map(([x, p]) => p).filter(p => p !== -1));
    let rightPadded = rightPaddings.map(
        ([x, p]) => p === -1 ? x : x.split("\t")[0] + " ".repeat(maxRightPadding - p + 1) + x.split("\t")[1]
    );
    let maxLength = Math.max(...rightPadded.slice(1).map(x => x.length));
    let lined = rightPadded.map(x => x.endsWith(FORK) ? x + HORIZ.repeat(maxLength - x.length) : x);
    return lined.join("\n");
}

function getCitation(node, nodeLines, currentProof) {
    return getCitationParts(node, nodeLines, currentProof).join(", ");
}

function getCitationParts(node, nodeLines, currentProof) {
    switch (node.type) {
        case "reiteration":
        case "conjunctionEliminationLeft":
        case "conjunctionEliminationRight":
        case "disjunctionIntroductionLeft":
        case "disjunctionIntroductionRight":
        case "explosion":
        case "doubleNegationElimination":
        case "deMorgansLawParAndOr":
        case "deMorgansLawOrAndPar":
        case "deMorgansLawParOrAnd":
        case "deMorgansLawAndOrPar":
            return [nodeLines[node.input]];
        case "conjunctionIntroduction":
        case "implicationElimination":
        case "biconditionalEliminationLeft":
        case "biconditionalEliminationRight":
        case "disjunctiveSyllogismLeft":
        case "disjunctiveSyllogismRight":
        case "modusTollens":
            return [nodeLines[node.input1], nodeLines[node.input2]];
        case "negationElimination":
            return [nodeLines[node.input2], nodeLines[node.input1]];
        case "implicationIntroduction":
        case "negationIntroduction":
        case "indirectProof":
            return getSubproofJustification(node.input, nodeLines, currentProof);
        case "biconditionalIntroduction":
        case "lawOfExcludedMiddle":
            return [getSubproofJustification(node.input1, nodeLines, currentProof),
                    getSubproofJustification(node.input2, nodeLines, currentProof)];
        case "disjunctionElimination":
            return [nodeLines[node.input1],
                    getSubproofJustification(node.input2, nodeLines, currentProof),
                    getSubproofJustification(node.input3, nodeLines, currentProof)];
        default:
            console.log(node, nodeLines, currentProof);
            return ["?"];
    }
}

function getSubproofJustification(nodeId, nodeLines, currentProof) {
    let endLine = nodeLines[nodeId];
    let proofLine = currentProof.find(line => line.lineNumber === endLine);
    let startLine = nodeLines[proofLine.assumptions.at(-1)];
    return `${startLine}-${endLine}`;
}

function getUsefulNodes() {
    let output = nodes.find(x => x.type === "output");
    return getDependenciesOf(output).map(x => nodes[x]);
}

function getDirectDependenciesOf(node) {
    if (node.input !== undefined) {
        return [node.input];
    } else {
        let i = 1;
        let output = [];
        while (node["input" + i] !== undefined) {
            output.push(node["input" + i]);
            i++;
        }
        return output;
    }
}

function getDependenciesOf(node) {
    let directDependencies = getDirectDependenciesOf(node);
    let output = new Set(directDependencies);
    for (let dd of directDependencies) {
        for (let x of getDependenciesOf(nodes[dd]))
            output.add(x);
    }
    return [...output];
}

function getSortedUsefulNodes() {
    let usefulNodes = getUsefulNodes();
    let dependencies = Object.fromEntries(usefulNodes.map(node => [node.id, getDependenciesOf(node)]));
    let processed = [];
    while (usefulNodes.length) {
        for (let node of usefulNodes) {
            if (dependencies[node.id].every(x => processed.includes(x))) {
                processed.push(node.id);
                usefulNodes.splice(usefulNodes.indexOf(node), 1);
                break;
            }
        }
    }
    return processed.map(x => nodes[x]);
}

function getPremises() {
    return getSortedUsefulNodes().filter(x => x.type === "premise");
}

function getDeductions() {
    return getSortedUsefulNodes().filter(x => x.type !== "premise");
}

function getOutputNode() {
    return nodes.find(x => x.type === "output");
}

function getHeader() {
    let premises = getPremises();
    let outputNode = getOutputNode();
    return (premises.map(x => postfixToText(getNodeOutput(x))).join(", ") +
            " " + THEREFORE + " " +
            postfixToText(getNodeOutput(outputNode))).trim()
}