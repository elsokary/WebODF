 /**
 * @license
 * Copyright (C) 2012-2013 KO GmbH <copyright@kogmbh.com>
 *
 * @licstart
 * The JavaScript code in this page is free software: you can redistribute it
 * and/or modify it under the terms of the GNU Affero General Public License
 * (GNU AGPL) as published by the Free Software Foundation, either version 3 of
 * the License, or (at your option) any later version.  The code is distributed
 * WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE.  See the GNU AGPL for more details.
 *
 * As additional permission under GNU AGPL version 3 section 7, you
 * may distribute non-source (e.g., minimized or compacted) forms of
 * that code without the copy of the GNU GPL normally required by
 * section 4, provided you include this license notice and a URL
 * through which recipients can access the Corresponding Source.
 *
 * As a special exception to the AGPL, any HTML file which merely makes function
 * calls to this code, and for that purpose includes it by reference shall be
 * deemed a separate work for copyright law purposes. In addition, the copyright
 * holders of this code give you permission to combine this code with free
 * software libraries that are released under the GNU LGPL. You may copy and
 * distribute such a system following the terms of the GNU AGPL for this code
 * and the LGPL for the libraries. If you modify this code, you may extend this
 * exception to your version of the code, but you are not obligated to do so.
 * If you do not wish to do so, delete this exception statement from your
 * version.
 *
 * This license applies to this entire compilation.
 * @licend
 * @source: http://www.webodf.org/
 * @source: http://gitorious.org/webodf/webodf/
 */

/*global Node, runtime, odf, NodeFilter*/

/**
 * @constructor
 */
odf.OdfUtils = function OdfUtils() {
    "use strict";

    var self = this,
        textns = "urn:oasis:names:tc:opendocument:xmlns:text:1.0",
        drawns = "urn:oasis:names:tc:opendocument:xmlns:drawing:1.0",
        whitespaceOnly = /^\s*$/;

   /**
     * Determine if the node is a text:p or a text:h element.
     * @param {?Node} e
     * @return {!boolean}
     */
    function isParagraph(e) {
        var name = e && e.localName;
        return (name === "p" || name === "h") && e.namespaceURI === textns;
    }
    this.isParagraph = isParagraph;

    /**
     * @param {?Node} node
     * @return {?Node}
     */
    this.getParagraphElement = function (node) {
        while (node && !isParagraph(node)) {
            node = node.parentNode;
        }
        return node;
    };

    /**
     * Determine if the node is a text:list-item element.
     * @param {?Node} e
     * @return {!boolean}
     */
    this.isListItem = function (e) {
        var name = e && e.localName;
        return name === "list-item" && e.namespaceURI === textns;
    };

    /**
     * Determine if the text consists entirely of whitespace characters.
     * At least one whitespace is required.
     * @param {!string} text
     * @return {!boolean}
     */
    function isODFWhitespace(text) {
        return (/^[ \t\r\n]+$/).test(text);
    }
    this.isODFWhitespace = isODFWhitespace;

    /**
     * Determine if the node is a grouping element.
     * @param {?Node} e
     * @return {!boolean}
     */
    function isGroupingElement(e) {
        var name = e && e.localName;
        return (name === "span" || name === "p" || name === "h")
            && e.namespaceURI === textns;
    }
    this.isGroupingElement = isGroupingElement;
    /**
     * Determine if the node is a grouping element.
     * @param {?Node} e
     * @return {!boolean}
     */
    function isCharacterElement(e) {
        var n = e && e.localName,
            ns,
            r = false;
        if (n) {
            ns = e.namespaceURI;
            if (ns === textns) {
                r = n === "s" || n === "tab" || n === "line-break";
            } else if (ns === drawns) {
                r = n === "frame" && e.getAttributeNS(textns, "anchor-type") === "as-char";
            }
        }
        return r;
    }
    this.isCharacterElement = isCharacterElement;
    /**
     * @param {!Node} node
     * @return {!Node}
     */
    function firstChild(node) {
        while (node.firstChild !== null && isGroupingElement(node)) {
            node = node.firstChild;
        }
        return node;
    }
    this.firstChild = firstChild;
    /**
     * @param {!Node} node
     * @return {!Node}
     */
    function lastChild(node) {
        while (node.lastChild !== null && isGroupingElement(node)) {
            node = node.lastChild;
        }
        return node;
    }
    this.lastChild = lastChild;
    /**
     * @param {!Node} node
     * @return {?Node}
     */
    function previousNode(node) {
        while (!isParagraph(node) && node.previousSibling === null) {
            node = /**@type{!Node}*/(node.parentNode);
        }
        return isParagraph(node) ? null : lastChild(/**@type{!Node}*/(node.previousSibling));
    }
    this.previousNode = previousNode;
    /**
     * @param {!Node} node
     * @return {?Node}
     */
    function nextNode(node) {
        while (!isParagraph(node) && node.nextSibling === null) {
            node = /**@type{!Node}*/(node.parentNode);
        }
        return isParagraph(node) ? null : firstChild(/**@type{!Node}*/(node.nextSibling));
    }
    this.nextNode = nextNode;

    /**
     * Walk to the left along the DOM and return true if the first thing
     * encountered is either a non-whitespace character or a character
     * element. Walking goes through grouping elements.
     * @param {?Node} node the first node to scan
     * @return {!boolean}
     */
    function scanLeftForNonWhitespace(node) {
        var r = false;
        while (node) {
            if (node.nodeType === Node.TEXT_NODE) {
                if (node.length === 0) {
                    node = previousNode(node);
                } else {
                    return !isODFWhitespace(
                        node.data.substr(node.length - 1, 1)
                    );
                }
            } else if (isCharacterElement(node)) {
                r = true;
                break;
            } else {
                node = previousNode(node);
            }
        }
        return r;
    }
    this.scanLeftForNonWhitespace = scanLeftForNonWhitespace;
    /**
     * Walk to the left along the DOM and return the type of the first
     * thing encountered.
     * 0 none of the below
     * 1 non-whitespace character or a character element
     * 2 whitespace character that is preceded by a non-whitespace character
     *   or a character element
     *
     * @param {!Node} node the first node to scan
     * @return {!number}
     */
    function lookLeftForCharacter(node) {
        var text, r = 0;
        if (node.nodeType === Node.TEXT_NODE && node.length > 0) {
            text = node.data;
            if (!isODFWhitespace(text.substr(text.length - 1, 1))) {
                r = 1; // character found
            } else if (text.length === 1) {
                r = scanLeftForNonWhitespace(previousNode(node)) ? 2 : 0;
            } else {
                r = isODFWhitespace(text.substr(text.length - 2, 1)) ? 0 : 2;
            }
        } else if (isCharacterElement(node)) {
            r = 1;
        }
        return r;
    }
    this.lookLeftForCharacter = lookLeftForCharacter;
    /**
     * Look to the right along the DOM and return true if the first thing
     * encountered is either a non-whitespace character or a character
     * element.
     *
     * @param {?Node} node the first node to scan
     * @return {!boolean}
     */
    function lookRightForCharacter(node) {
        var r = false;
        if (node && node.nodeType === Node.TEXT_NODE && node.length > 0) {
            r = !isODFWhitespace(node.data.substr(0, 1));
        } else if (isCharacterElement(node)) {
            r = true;
        }
        return r;
    }
    this.lookRightForCharacter = lookRightForCharacter;
    /**
     * Walk to the left along the DOM and return true if either a
     * non-whitespace character or a character element is encountered.
     *
     * @param {?Node} node the first node to scan
     * @return {!boolean}
     */
    function scanLeftForAnyCharacter(node) {
        var r = false;
        node = node && lastChild(node);
        while (node) {
            if (node.nodeType === Node.TEXT_NODE && node.length > 0
                    && !isODFWhitespace(node.data)) {
                r = true;
                break;
            } else if (isCharacterElement(node)) {
                r = true;
                break;
            }
            node = previousNode(node);
        }
        return r;
    }
    this.scanLeftForAnyCharacter = scanLeftForAnyCharacter;
    /**
     * Walk to the right along the DOM and return true if either a
     * non-whitespace character or a character element is encountered.
     *
     * @param {?Node} node the first node to scan
     * @return {!boolean}
     */
    function scanRightForAnyCharacter(node) {
        var r = false;
        node = node && firstChild(node);
        while (node) {
            if (node.nodeType === Node.TEXT_NODE && node.length > 0
                    && !isODFWhitespace(node.data)) {
                r = true;
                break;
            } else if (isCharacterElement(node)) {
                r = true;
                break;
            }
            node = nextNode(node);
        }
        return r;
    }
    this.scanRightForAnyCharacter = scanRightForAnyCharacter;

    /**
     * check if the node is part of the trailing whitespace
     * @param {!Node} textnode
     * @param {!number} offset
     * @return {!boolean}
     */
    function isTrailingWhitespace(textnode, offset) {
        if (!isODFWhitespace(textnode.data.substr(offset))) {
            return false;
        }
        return !scanRightForAnyCharacter(nextNode(textnode));
    }
    this.isTrailingWhitespace = isTrailingWhitespace;

    function isSignificantWhitespace(textNode, offset) {
        var text = textNode.data,
            leftChar,
            leftNode,
            rightChar,
            rightNode,
            result;

        if (!isODFWhitespace(text[offset])) {
            return false;
        }

        if (offset > 0) {
            if (!isODFWhitespace(text[offset - 1])) {
                return true;
            }

            if (offset > 1) {
                if (!isODFWhitespace(text[offset - 2])) {
                    result = true;
                } else if (!isODFWhitespace(text.substr(0, offset))) {
                    return false;
                }
            } else if (scanLeftForNonWhitespace(previousNode(textNode))) {
                result = true;
            }

            if (result === true) {
                return isTrailingWhitespace(textNode, offset)
                    ? false : true;
            }

            rightChar = text[offset + 1];
            if (isODFWhitespace(rightChar)) {
                return false;
            }
            return scanLeftForAnyCharacter(previousNode(textNode))
                ? false : true;
        }
        return false;
    }
    /** Takes a textNode and an offset, and returns true if the character
     * at that offset is a significant whitespace.
     * @param {!Node} textNode
     * @param {!number} offset
     * @return {!boolean}
     */
    this.isSignificantWhitespace = isSignificantWhitespace;

    /**
     * Returns the first non-whitespace-only child of a given node
     * @param {Node} node
     * @returns {Node|null}
     */
    function getFirstNonWhitespaceChild(node) {
        var child = node.firstChild;
        while (child && child.nodeType === Node.TEXT_NODE && whitespaceOnly.test(child.nodeValue)) {
            child = child.nextSibling;
        }
        return child;
    }
    this.getFirstNonWhitespaceChild = getFirstNonWhitespaceChild;

    /**
     * Returns the length split as value and unit, from an ODF attribute
     * @param {!string} length
     * @return {?{value:!number,unit:!string}}
     */
    function parseLength(length) {
        var re = /-?([0-9]*[0-9][0-9]*(\.[0-9]*)?|0+\.[0-9]*[1-9][0-9]*|\.[0-9]*[1-9][0-9]*)((cm)|(mm)|(in)|(pt)|(pc)|(px)|(%))/,
            m = re.exec(length);
        if (!m) {
            return null;
        }
        return {value: parseFloat(m[1]), unit: m[3]};
    }
    this.parseLength = parseLength;

    /**
     * Returns the value and unit of the length, if it is positive ( > 0)
     * @param {!string} length
     * @return {?{value:!number,unit:!string}}
     */
    function parsePositiveLength(length) {
        var result = parseLength(length);
        if (result && (result.value <= 0 || result.unit === '%')) {
            return null;
        }
        return result;
    }

    /**
     * Returns the value and unit of the length, if it is non-negative ( >= 0)
     * @param {!string} length
     * @return {?{value:!number,unit:!string}}
     */
    function parseNonNegativeLength(length) {
        var result = parseLength(length);
        if (result && (result.value < 0 || result.unit === '%')) {
            return null;
        }
        return result;
    }

    /**
     * Returns the value and unit(%) of the length, if it is specified in %age
     * @param {!string} length
     * @return {?{value:!number,unit:!string}}
     */
    function parsePercentage(length) {
        var result = parseLength(length);
        if (result && (result.unit !== '%')) {
            return null;
        }
        return result;
    }

    /**
     * Returns the value and unit of the font size, in conformance with fo:font-size
     * constraints
     * @param {!string} fontSize
     * @return {?{value:!number,unit:!string}}
     */
    function parseFoFontSize(fontSize) {
        return parsePositiveLength(fontSize) || parsePercentage(fontSize);
    }
    this.parseFoFontSize = parseFoFontSize;

    /**
     * Returns the value and unit of the line height, in conformance with fo:line-height
     * constraints
     * @param {!string} lineHeight
     * @return {?{value:!number,unit:!string}}
     */
    function parseFoLineHeight(lineHeight) {
        return parseNonNegativeLength(lineHeight) || parsePercentage(lineHeight);
    }
    this.parseFoLineHeight = parseFoLineHeight;

    /**
     * Returns a array of text nodes considered to be part of the supplied range.
     * This will exclude elements that are not part of the ODT main text bot
     * @param {!Range} range    Range to search for nodes within
     * @param {boolean=} includePartial Include partially intersecting text nodes in the result. Default value is true
     * @returns {!Array.<!CharacterData>}
     */
    function getTextNodes(range, includePartial) {
        var document = range.startContainer.ownerDocument,
            nodeRange = document.createRange(),
            textNodes = [],
            n,
            root = /**@type {!Node}*/ (range.commonAncestorContainer.nodeType === Node.TEXT_NODE ?
                range.commonAncestorContainer.parentNode : range.commonAncestorContainer),
            treeWalker;

        treeWalker = document.createTreeWalker(root,
            NodeFilter.SHOW_ALL,
            function (node) {
                nodeRange.selectNodeContents(node);
                // TODO exclude child nodes of non-body elements as per ODT plain text rules
                if (includePartial === false && node.nodeType === Node.TEXT_NODE) {
                    if (range.compareBoundaryPoints(range.START_TO_START, nodeRange) <= 0
                        && range.compareBoundaryPoints(range.END_TO_END, nodeRange) >= 0) {
                        return NodeFilter.FILTER_ACCEPT;
                    }
                } else if (range.compareBoundaryPoints(range.END_TO_START, nodeRange) === -1
                    && range.compareBoundaryPoints(range.START_TO_END, nodeRange) === 1) {
                    return node.nodeType === Node.TEXT_NODE ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
                }
                return NodeFilter.FILTER_REJECT;
            },
            false);

        // Make the first call to nextNode return startContainer
        treeWalker.currentNode = range.startContainer.previousSibling || range.startContainer.parentNode;

        n = treeWalker.nextNode();
        while (n) {
            textNodes.push(n);
            n = treeWalker.nextNode();
        }

        nodeRange.detach();
        return textNodes;
    }
    this.getTextNodes = getTextNodes;
};
