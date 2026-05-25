import type { CompetitiveProblem } from "./problem-schemas";

export const problemSeeds: CompetitiveProblem[] = [
  // ─────────────── EASY ───────────────
  {
    mode: "competitive",
    title: "Two Sum",
    statement: "Given an array of integers and a target sum, return the two numbers that add up to the target. Return them in ascending order. You may assume exactly one solution exists.",
    difficulty: "easy",
    constraints: ["2 <= nums.length <= 1000", "-1000 <= nums[i] <= 1000", "Exactly one valid answer exists"],
    functionSignature: {
      name: "twoSum",
      params: [{ name: "nums", type: "number[]" }, { name: "target", type: "number" }],
      returnType: "number[]",
    },
    examples: [
      { args: [[2, 7, 11, 15], 9], output: [2, 7], explanation: "2 + 7 = 9" },
      { args: [[3, 2, 4], 6], output: [2, 4], explanation: "2 + 4 = 6" },
    ],
    testCases: [
      { args: [[2, 7, 11, 15], 9], expectedOutput: [2, 7], isHidden: false },
      { args: [[3, 2, 4], 6], expectedOutput: [2, 4], isHidden: false },
      { args: [[3, 3], 6], expectedOutput: [3, 3], isHidden: true },
      { args: [[1, 5, 3, 7], 8], expectedOutput: [1, 7], isHidden: true },
    ],
    sourceKind: "permissive",
  },
  {
    mode: "competitive",
    title: "Reverse Array",
    statement: "Given an array of integers, return a new array with the elements in reversed order.",
    difficulty: "easy",
    constraints: ["1 <= arr.length <= 1000", "-1000 <= arr[i] <= 1000"],
    functionSignature: {
      name: "reverseArray",
      params: [{ name: "arr", type: "number[]" }],
      returnType: "number[]",
    },
    examples: [
      { args: [[1, 2, 3, 4, 5]], output: [5, 4, 3, 2, 1], explanation: "Reversed" },
    ],
    testCases: [
      { args: [[1, 2, 3, 4, 5]], expectedOutput: [5, 4, 3, 2, 1], isHidden: false },
      { args: [[1, 2]], expectedOutput: [2, 1], isHidden: false },
      { args: [[5]], expectedOutput: [5], isHidden: true },
      { args: [[1, 2, 3]], expectedOutput: [3, 2, 1], isHidden: true },
    ],
    sourceKind: "permissive",
  },
  {
    mode: "competitive",
    title: "Maximum Element",
    statement: "Given an array of integers, return the largest element in the array.",
    difficulty: "easy",
    constraints: ["1 <= arr.length <= 1000", "-10000 <= arr[i] <= 10000"],
    functionSignature: {
      name: "maxElement",
      params: [{ name: "arr", type: "number[]" }],
      returnType: "number",
    },
    examples: [
      { args: [[3, 1, 4, 1, 5, 9, 2, 6]], output: 9 },
    ],
    testCases: [
      { args: [[3, 1, 4, 1, 5, 9, 2, 6]], expectedOutput: 9, isHidden: false },
      { args: [[-1, -5, -2, -3]], expectedOutput: -1, isHidden: false },
      { args: [[7]], expectedOutput: 7, isHidden: true },
      { args: [[1, 2, 3, 4, 5]], expectedOutput: 5, isHidden: true },
    ],
    sourceKind: "permissive",
  },
  {
    mode: "competitive",
    title: "Single Number",
    statement: "Given an array where every element appears exactly twice except for one element which appears only once, return the element that appears only once.",
    difficulty: "easy",
    constraints: ["1 <= nums.length <= 1000", "-10000 <= nums[i] <= 10000", "All elements except one appear exactly twice"],
    functionSignature: {
      name: "singleNumber",
      params: [{ name: "nums", type: "number[]" }],
      returnType: "number",
    },
    examples: [
      { args: [[2, 2, 1]], output: 1 },
      { args: [[4, 1, 2, 1, 2]], output: 4 },
    ],
    testCases: [
      { args: [[2, 2, 1]], expectedOutput: 1, isHidden: false },
      { args: [[4, 1, 2, 1, 2]], expectedOutput: 4, isHidden: false },
      { args: [[1]], expectedOutput: 1, isHidden: true },
      { args: [[5, 3, 3]], expectedOutput: 5, isHidden: true },
    ],
    sourceKind: "permissive",
  },
  {
    mode: "competitive",
    title: "Fibonacci Number",
    statement: "Given a non-negative integer n, return the nth Fibonacci number. The sequence starts: 0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55...",
    difficulty: "easy",
    constraints: ["0 <= n <= 30"],
    functionSignature: {
      name: "fibonacci",
      params: [{ name: "n", type: "number" }],
      returnType: "number",
    },
    examples: [
      { args: [5], output: 5, explanation: "0,1,1,2,3,5 — index 5 is 5" },
    ],
    testCases: [
      { args: [0], expectedOutput: 0, isHidden: false },
      { args: [1], expectedOutput: 1, isHidden: false },
      { args: [5], expectedOutput: 5, isHidden: true },
      { args: [10], expectedOutput: 55, isHidden: true },
    ],
    sourceKind: "permissive",
  },
  {
    mode: "competitive",
    title: "Count Occurrences",
    statement: "Given an array of integers and a target value, return how many times the target appears in the array.",
    difficulty: "easy",
    constraints: ["0 <= arr.length <= 1000", "-1000 <= arr[i], target <= 1000"],
    functionSignature: {
      name: "countOccurrences",
      params: [{ name: "arr", type: "number[]" }, { name: "target", type: "number" }],
      returnType: "number",
    },
    examples: [
      { args: [[1, 2, 2, 3, 3, 3], 3], output: 3 },
    ],
    testCases: [
      { args: [[1, 2, 2, 3, 3, 3], 3], expectedOutput: 3, isHidden: false },
      { args: [[1, 2, 3], 4], expectedOutput: 0, isHidden: false },
      { args: [[5, 5, 5, 5], 5], expectedOutput: 4, isHidden: true },
      { args: [[1], 1], expectedOutput: 1, isHidden: true },
    ],
    sourceKind: "permissive",
  },

  // ─────────────── MEDIUM ───────────────
  {
    mode: "competitive",
    title: "Maximum Subarray Sum",
    statement: "Given an integer array, find the contiguous subarray with the largest sum and return its sum. The array contains at least one element.",
    difficulty: "medium",
    constraints: ["1 <= nums.length <= 10000", "-10000 <= nums[i] <= 10000"],
    functionSignature: {
      name: "maxSubarraySum",
      params: [{ name: "nums", type: "number[]" }],
      returnType: "number",
    },
    examples: [
      { args: [[-2, 1, -3, 4, -1, 2, 1, -5, 4]], output: 6, explanation: "Subarray [4,-1,2,1] has sum 6" },
    ],
    testCases: [
      { args: [[-2, 1, -3, 4, -1, 2, 1, -5, 4]], expectedOutput: 6, isHidden: false },
      { args: [[1]], expectedOutput: 1, isHidden: false },
      { args: [[-1, -2, -3]], expectedOutput: -1, isHidden: true },
      { args: [[5, 4, -1, 7, 8]], expectedOutput: 23, isHidden: true },
    ],
    sourceKind: "permissive",
  },
  {
    mode: "competitive",
    title: "Merge Sorted Arrays",
    statement: "Given two sorted arrays of integers, merge them into a single sorted array and return it.",
    difficulty: "medium",
    constraints: ["0 <= arr1.length, arr2.length <= 1000", "-10000 <= arr1[i], arr2[i] <= 10000"],
    functionSignature: {
      name: "mergeSortedArrays",
      params: [{ name: "arr1", type: "number[]" }, { name: "arr2", type: "number[]" }],
      returnType: "number[]",
    },
    examples: [
      { args: [[1, 3, 5], [2, 4, 6]], output: [1, 2, 3, 4, 5, 6] },
    ],
    testCases: [
      { args: [[1, 3, 5], [2, 4, 6]], expectedOutput: [1, 2, 3, 4, 5, 6], isHidden: false },
      { args: [[1, 2, 3], []], expectedOutput: [1, 2, 3], isHidden: false },
      { args: [[], [1, 2]], expectedOutput: [1, 2], isHidden: true },
      { args: [[1, 1, 1], [1, 1, 1]], expectedOutput: [1, 1, 1, 1, 1, 1], isHidden: true },
    ],
    sourceKind: "permissive",
  },
  {
    mode: "competitive",
    title: "Missing Number",
    statement: "Given an array containing n distinct numbers taken from 0 to n, return the one number that is missing from the array.",
    difficulty: "medium",
    constraints: ["1 <= nums.length <= 1000", "0 <= nums[i] <= nums.length", "All numbers are distinct"],
    functionSignature: {
      name: "missingNumber",
      params: [{ name: "nums", type: "number[]" }],
      returnType: "number",
    },
    examples: [
      { args: [[3, 0, 1]], output: 2, explanation: "n=3, numbers 0-3 except 2" },
    ],
    testCases: [
      { args: [[3, 0, 1]], expectedOutput: 2, isHidden: false },
      { args: [[0, 1]], expectedOutput: 2, isHidden: false },
      { args: [[0]], expectedOutput: 1, isHidden: true },
      { args: [[9, 6, 4, 2, 3, 5, 7, 0, 1]], expectedOutput: 8, isHidden: true },
    ],
    sourceKind: "permissive",
  },
  {
    mode: "competitive",
    title: "Longest Common Prefix",
    statement: "Write a function to find the longest common prefix string among an array of strings. If there is no common prefix, return an empty string.",
    difficulty: "medium",
    constraints: ["1 <= strs.length <= 200", "0 <= strs[i].length <= 200", "strs[i] consists of lowercase English letters only"],
    functionSignature: {
      name: "longestCommonPrefix",
      params: [{ name: "strs", type: "string[]" }],
      returnType: "string",
    },
    examples: [
      { args: [["flower", "flow", "flight"]], output: "fl" },
      { args: [["dog", "racecar", "car"]], output: "" },
    ],
    testCases: [
      { args: [["flower", "flow", "flight"]], expectedOutput: "fl", isHidden: false },
      { args: [["dog", "racecar", "car"]], expectedOutput: "", isHidden: false },
      { args: [["abc", "abc", "abc"]], expectedOutput: "abc", isHidden: true },
      { args: [["a"]], expectedOutput: "a", isHidden: true },
    ],
    sourceKind: "permissive",
  },
  {
    mode: "competitive",
    title: "Move Zeroes",
    statement: "Given an array of integers, move all zeroes to the end while maintaining the relative order of the non-zero elements. Return the modified array.",
    difficulty: "medium",
    constraints: ["1 <= nums.length <= 1000", "-1000 <= nums[i] <= 1000"],
    functionSignature: {
      name: "moveZeroes",
      params: [{ name: "nums", type: "number[]" }],
      returnType: "number[]",
    },
    examples: [
      { args: [[0, 1, 0, 3, 12]], output: [1, 3, 12, 0, 0] },
    ],
    testCases: [
      { args: [[0, 1, 0, 3, 12]], expectedOutput: [1, 3, 12, 0, 0], isHidden: false },
      { args: [[0]], expectedOutput: [0], isHidden: false },
      { args: [[1, 2, 3]], expectedOutput: [1, 2, 3], isHidden: true },
      { args: [[0, 0, 1]], expectedOutput: [1, 0, 0], isHidden: true },
    ],
    sourceKind: "permissive",
  },
  {
    mode: "competitive",
    title: "Rotate Array",
    statement: "Given an integer array and a non-negative integer k, rotate the array to the right by k steps and return the result.",
    difficulty: "medium",
    constraints: ["1 <= nums.length <= 1000", "-1000 <= nums[i] <= 1000", "0 <= k <= 10000"],
    functionSignature: {
      name: "rotateArray",
      params: [{ name: "nums", type: "number[]" }, { name: "k", type: "number" }],
      returnType: "number[]",
    },
    examples: [
      { args: [[1, 2, 3, 4, 5, 6, 7], 3], output: [5, 6, 7, 1, 2, 3, 4] },
    ],
    testCases: [
      { args: [[1, 2, 3, 4, 5, 6, 7], 3], expectedOutput: [5, 6, 7, 1, 2, 3, 4], isHidden: false },
      { args: [[-1, -100, 3, 99], 2], expectedOutput: [3, 99, -1, -100], isHidden: false },
      { args: [[1, 2], 3], expectedOutput: [2, 1], isHidden: true },
      { args: [[1], 5], expectedOutput: [1], isHidden: true },
    ],
    sourceKind: "permissive",
  },

  // ─────────────── HARD ───────────────
  {
    mode: "competitive",
    title: "Coin Change",
    statement: "Given an array of coin denominations and a target amount, return the minimum number of coins needed to make up the amount. If the amount cannot be reached, return -1.",
    difficulty: "hard",
    constraints: ["1 <= coins.length <= 12", "1 <= coins[i] <= 2^31 - 1", "0 <= amount <= 10000"],
    functionSignature: {
      name: "coinChange",
      params: [{ name: "coins", type: "number[]" }, { name: "amount", type: "number" }],
      returnType: "number",
    },
    examples: [
      { args: [[1, 2, 5], 11], output: 3, explanation: "5+5+1 = 11 using 3 coins" },
    ],
    testCases: [
      { args: [[1, 2, 5], 11], expectedOutput: 3, isHidden: false },
      { args: [[2], 3], expectedOutput: -1, isHidden: false },
      { args: [[1], 0], expectedOutput: 0, isHidden: true },
      { args: [[1, 5, 6, 9], 11], expectedOutput: 2, isHidden: true },
    ],
    sourceKind: "permissive",
  },
  {
    mode: "competitive",
    title: "Longest Increasing Subsequence",
    statement: "Given an integer array, return the length of the longest strictly increasing subsequence.",
    difficulty: "hard",
    constraints: ["1 <= nums.length <= 2500", "-10000 <= nums[i] <= 10000"],
    functionSignature: {
      name: "lengthOfLIS",
      params: [{ name: "nums", type: "number[]" }],
      returnType: "number",
    },
    examples: [
      { args: [[10, 9, 2, 5, 3, 7, 101, 18]], output: 4, explanation: "LIS is [2,3,7,101] or [2,5,7,101]" },
    ],
    testCases: [
      { args: [[10, 9, 2, 5, 3, 7, 101, 18]], expectedOutput: 4, isHidden: false },
      { args: [[0, 1, 0, 3, 2, 3]], expectedOutput: 4, isHidden: false },
      { args: [[7, 7, 7, 7, 7]], expectedOutput: 1, isHidden: true },
      { args: [[1, 3, 6, 7, 9, 4, 10, 5, 6]], expectedOutput: 6, isHidden: true },
    ],
    sourceKind: "permissive",
  },
  {
    mode: "competitive",
    title: "Maximum Product Subarray",
    statement: "Given an integer array, find the contiguous subarray that has the largest product and return that product.",
    difficulty: "hard",
    constraints: ["1 <= nums.length <= 20000", "-10 <= nums[i] <= 10", "The product of any subarray fits in a 32-bit integer"],
    functionSignature: {
      name: "maxProduct",
      params: [{ name: "nums", type: "number[]" }],
      returnType: "number",
    },
    examples: [
      { args: [[2, 3, -2, 4]], output: 6, explanation: "Subarray [2,3] has product 6" },
    ],
    testCases: [
      { args: [[2, 3, -2, 4]], expectedOutput: 6, isHidden: false },
      { args: [[-2, 0, -1]], expectedOutput: 0, isHidden: false },
      { args: [[-2, 3, -4]], expectedOutput: 24, isHidden: true },
      { args: [[1, -2, -3, 4]], expectedOutput: 24, isHidden: true },
    ],
    sourceKind: "permissive",
  },
];
