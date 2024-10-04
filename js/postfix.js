function textToPostfix(text) {
    text = text.replaceAll(" ", "")
               .replaceAll("~", NOT)
               .replaceAll("^", AND)
               .replaceAll("+", OR)
               .replaceAll(">", IMPLIES)
               .replaceAll("=", BICONDITIONAL)
               .replaceAll(/[\[{]/g, "(")
               .replaceAll(/[\]}]/g, ")")
               .toUpperCase();
    for (let c of text)
        if (!(new RegExp("^[A-Z()" + NOT + BINARY_OPERATORS.filter(x => x !== ASSUMING).join("") + "]*$")).test(c))
            throw new SyntaxError("Unrecognized character: \"" + c + "\"");
    if (text.length === 1 && /^[A-Z]$/.test(text))
        return text;
    if (new RegExp("^" + NOT + "+[A-Z]$").test(text))
        return [textToPostfix(text.slice(1)), NOT];
    let topLevelOperatorIndex = null;
    let depth = 0;
    for (let i = 0; i < text.length; i++) {
        if (text[i] === "(") depth++;
        if (text[i] === ")") depth--;
        if (depth < 0) throw new SyntaxError("Mismatched parentheses: \"" + text + "\"");
        if (depth === 0 && BINARY_OPERATORS.includes(text[i])) {
            if (topLevelOperatorIndex !== null)
                throw new SyntaxError("Multiple main logical operators: \"" + text + "\"");
            else topLevelOperatorIndex = i;
        }
    }
    if (depth > 0)
        throw new SyntaxError("Mismatched parentheses: \"" + text + "\"");
    if (topLevelOperatorIndex !== null)
        return [
            textToPostfix(text.slice(0, topLevelOperatorIndex)),
            textToPostfix(text.slice(topLevelOperatorIndex + 1)),
            text[topLevelOperatorIndex]
        ];
    if (new RegExp("^" + NOT + "+\(.*\)$").test(text))
        return [textToPostfix(text.slice(1)), NOT];
    if (text.startsWith("(") && text.endsWith(")"))
        return textToPostfix(text.slice(1, -1));
    throw new SyntaxError("Invalid syntax: \"" + text + "\"");
}

function postfixToText(postfix) {
    if (!postfix || typeof postfix !== "object") return postfix;
    let operator = postfix.at(-1);
    if (operator === NOT) {
        return NOT + parenthesizeArgument(postfixToText(postfix[0]));
    } else {
        return parenthesizeArgument(postfixToText(postfix[0])) + operator + parenthesizeArgument(postfixToText(postfix[1]));
    }
}

function parenthesizeArgument(arg) {
    if (!arg) return arg;
    if (BINARY_OPERATORS.some(x => arg.includes(x))) arg = "(" + arg + ")";
    return arg;
}

function postfixEquals(postfix1, postfix2) {
    let isObj1 = typeof postfix1 === "object";
    let isObj2 = typeof postfix2 === "object";
    if (isObj1 !== isObj2) return false;
    if (!isObj1) return postfix1 === postfix2;
    if (postfix1.length !== postfix2.length) return false;
    for (let i = 0; i < postfix1.length; i++) {
        if (!postfixEquals(postfix1[i], postfix2[i])) return false;
    }
    return true;
}