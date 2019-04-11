﻿/**
 * Code Analysis - Output wrapped nodes info.
 * ------------------------------------------
 * This outputs information into wrapped-nodes.md saying what nodes have been wrapped and which ones haven't been.
 *
 * In the future, this should check which properites in the compiler haven't been used in this library by doing a "find references" on
 * all the compiler node properties.
 * ------------------------------------------
 */
import * as path from "path";
import * as fs from "fs";
import { rootFolder } from "../config";
import { InspectorFactory, TsNode, TsNodeProperty } from "../inspectors";

// setup
const inspectorFactory = new InspectorFactory();
const tsInspector = inspectorFactory.getTsInspector();

// get info
const tsNodes = tsInspector.getTsNodes().filter(n => !n.isTsMorphTsNode());

// figure out ts nodes that are wrapped and not wrapped
const wrappedTsNodes = tsNodes.filter(i => i.getAssociatedWrappedNode() != null || isImplementedViaMixins(i));
const notWrappedTsNodes = tsNodes.filter(i => wrappedTsNodes.indexOf(i) === -1 && !isIgnoredNode(i));

// output the results (todo: use a template for the output)
let output = "# Wrapped Nodes\n\n" +
    "This file is automatically generated and shows which nodes have been wrapped or not. " +
    "More information will be added to this in the future.\n\n" +
    "The disadvantage to a node not being wrapped is that it won't have helper methods for navigation and manipulation—it will be still " +
    "be wrapped as a `Node`. " +
    "If you would like a node to be wrapped, then please open up an issue and I will give it priority. " +
    "Otherwise they will continue to be slowly wrapped over time.\n\n";
outputCoverage("Exist", wrappedTsNodes);
output += "\n";
outputCoverage("Not Exist", notWrappedTsNodes);
fs.writeFileSync(path.join(rootFolder, "wrapped-nodes.md"), output);

// play a tone to indicate it's done
console.log("\x07");

function outputCoverage(header: string, tsNodesForOutput: TsNode[], additionalText?: string) {
    output += `## ${header}\n\n`;
    if (additionalText != null)
        output += additionalText + "\n\n";
    output += `**Total:** ${tsNodesForOutput.length}\n\n`;

    for (const tsNode of tsNodesForOutput) {
        console.log("Examining: " + tsNode.getName());
        const wrappedNode = tsNode.getAssociatedWrappedNode();
        if (wrappedNode == null)
            output += `* ${tsNode.getName()}`;
        else
            output += `* [${tsNode.getName()}](${getRelativePath(wrappedNode.getFilePath())})`;
        output += isImplementedViaMixins(tsNode) ? " - Implemented via mixin." : "";
        output += "\n";
        if (wrappedNode != null) {
            const properties = tsNode.getProperties();
            for (const prop of properties) {
                if (!isPropertyToIgnore(prop))
                    outputProperty(prop);
            }
        }
    }

    function outputProperty(prop: TsNodeProperty) {
        output += `    * ${prop.isReferenced() ? ":heavy_check_mark:" : ":x:"} ${prop.getName()}\n`;
    }
}

// config

function isPropertyToIgnore(prop: TsNodeProperty) {
    return prop.getName() === "kind" ||
        prop.getName() === "parent" ||
        prop.getName()[0] === "_";
}

function isIgnoredNode(node: TsNode) {
    switch (node.getName()) {
        // this would be implemented via a mixin
        case "Declaration":
            return true;
        default:
            return false;
    }
}

function isImplementedViaMixins(node: TsNode) {
    switch (node.getName()) {
        case "NamedDeclaration":
        case "FunctionLikeDeclarationBase":
        case "SignatureDeclarationBase":
            return true;
        default:
            return false;
    }
}

function getRelativePath(absolutePath: string) {
    const index = absolutePath.indexOf("src/compiler");
    if (index === -1)
        throw new Error(`Unexpected path: ${absolutePath}`);
    return absolutePath.substring(index);
}
