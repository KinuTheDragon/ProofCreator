const NOT = "¬";
const AND = "∧";
const OR = "∨";
const IMPLIES = "⇒";
const BICONDITIONAL = "⇔";
const THEREFORE = "∴";
const CONTRADICTION = "⊥";
const ASSUMING = "⊳";

const LEFT = "←";
const RIGHT = "→";

const PHI = "ϕ";
const PSI = "ψ";
const CHI = "χ";

const VERT = "│";
const HORIZ = "─";
const FORK = "├";

const BINARY_OPERATORS = [AND, OR, IMPLIES, BICONDITIONAL, ASSUMING];

const UPSCALE = 10;

const LINE_WIDTH = 2.5;
const FONT_SIZE = 16;
const ASSUMPTION_RESIZER_SIZE = 20;

const UPDATE_RATE = 1000 / 60;

const LABELS = {
    reiteration: {
        left: [PHI],
        right: PHI
    },
    conjunctionIntroduction: {
        left: [PHI, PSI],
        right: PHI + AND + PSI
    },
    conjunctionEliminationLeft: {
        left: [PHI + AND + PSI],
        right: PHI
    },
    conjunctionEliminationRight: {
        left: [PHI + AND + PSI],
        right: PSI
    },
    implicationIntroduction: {
        left: [PSI + ASSUMING + PHI],
        right: PHI + IMPLIES + PSI
    },
    implicationElimination: {
        left: [PHI + IMPLIES + PSI, PHI],
        right: PSI
    },
    biconditionalIntroduction: {
        left: [PSI + ASSUMING + PHI, PHI + ASSUMING + PSI],
        right: PHI + BICONDITIONAL + PSI
    },
    biconditionalEliminationLeft: {
        left: [PHI + BICONDITIONAL + PSI, PHI],
        right: PSI
    },
    biconditionalEliminationRight: {
        left: [PHI + BICONDITIONAL + PSI, PSI],
        right: PHI
    },
    disjunctionIntroductionLeft: {
        left: [PHI],
        right: PHI + OR + PSI
    },
    disjunctionIntroductionRight: {
        left: [PHI],
        right: PSI + OR + PHI
    },
    disjunctionElimination: {
        left: [PHI + OR + PSI, CHI + ASSUMING + PHI, CHI + ASSUMING + PSI],
        right: CHI
    },
    negationIntroduction: {
        left: [CONTRADICTION + ASSUMING + PHI],
        right: NOT + PHI
    },
    negationElimination: {
        left: [PHI, NOT + PHI],
        right: CONTRADICTION
    },
    indirectProof: {
        left: [CONTRADICTION + ASSUMING + NOT + PHI],
        right: PHI
    },
    explosion: {
        left: [CONTRADICTION],
        right: PHI
    },
    disjunctiveSyllogismLeft: {
        left: [PHI + OR + PSI, NOT + PHI],
        right: PSI
    },
    disjunctiveSyllogismRight: {
        left: [PHI + OR + PSI, NOT + PSI],
        right: PHI
    },
    modusTollens: {
        left: [PHI + IMPLIES + PSI, NOT + PSI],
        right: NOT + PHI
    },
    doubleNegationElimination: {
        left: [NOT + NOT + PHI],
        right: PHI
    },
    lawOfExcludedMiddle: {
        left: [PSI + ASSUMING + PHI, PSI + ASSUMING + NOT + PHI],
        right: PSI
    },
    deMorgansLawParAndOr: {
        left: [NOT + "(" + PHI + AND + PSI + ")"],
        right: NOT + PHI + OR + NOT + PSI
    },
    deMorgansLawOrAndPar: {
        left: [NOT + PHI + OR + NOT + PSI],
        right: NOT + "(" + PHI + AND + PSI + ")"
    },
    deMorgansLawParOrAnd: {
        left: [NOT + "(" + PHI + OR + PSI + ")"],
        right: NOT + PHI + AND + NOT + PSI
    },
    deMorgansLawAndOrPar: {
        left: [NOT + PHI + AND + NOT + PSI],
        right: NOT + "(" + PHI + OR + PSI + ")"
    }
};

const HEADERS = {
    reiteration: "R",
    conjunctionIntroduction: AND + "I",
    conjunctionEliminationLeft: AND + "E (" + LEFT + ")",
    conjunctionEliminationRight: AND + "E (" + RIGHT + ")",
    implicationIntroduction: IMPLIES + "I",
    implicationElimination: IMPLIES + "E",
    biconditionalIntroduction: BICONDITIONAL + "I",
    biconditionalEliminationLeft: BICONDITIONAL + "E (" + LEFT + ")",
    biconditionalEliminationRight: BICONDITIONAL + "E (" + RIGHT + ")",
    disjunctionElimination: OR + "E",
    negationIntroduction: NOT + "I",
    negationElimination: NOT + "E",
    indirectProof: "IP",
    disjunctiveSyllogismLeft: "DS (" + LEFT + ")",
    disjunctiveSyllogismRight: "DS (" + RIGHT + ")",
    modusTollens: "MT",
    doubleNegationElimination: "DNE",
    lawOfExcludedMiddle: "LEM",
    deMorgansLawParAndOr: "DeM ((" + AND + ") to " + OR + ")",
    deMorgansLawOrAndPar: "DeM (" + OR + " to (" + AND + "))",
    deMorgansLawParOrAnd: "DeM ((" + OR + ") to " + AND + ")",
    deMorgansLawAndOrPar: "DeM (" + AND + " to (" + OR + "))"
};

const JUSTIFICATIONS = {
    reiteration: "R",
    conjunctionIntroduction: AND + "I",
    conjunctionEliminationLeft: AND + "E",
    conjunctionEliminationRight: AND + "E",
    implicationIntroduction: IMPLIES + "I",
    implicationElimination: IMPLIES + "E",
    biconditionalIntroduction: BICONDITIONAL + "I",
    biconditionalEliminationLeft: BICONDITIONAL + "E",
    biconditionalEliminationRight: BICONDITIONAL + "E",
    disjunctionElimination: OR + "E",
    negationIntroduction: NOT + "I",
    negationElimination: NOT + "E",
    indirectProof: "IP",
    disjunctiveSyllogismLeft: "DS",
    disjunctiveSyllogismRight: "DS",
    modusTollens: "MT",
    doubleNegationElimination: "DNE",
    lawOfExcludedMiddle: "LEM",
    deMorgansLawParAndOr: "DeM",
    deMorgansLawOrAndPar: "DeM",
    deMorgansLawParOrAnd: "DeM",
    deMorgansLawAndOrPar: "DeM"
};