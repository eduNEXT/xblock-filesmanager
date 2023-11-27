import { v4 as uuid4 } from 'uuid';

/**
 * Adds an ID to each string in the input array and returns an array of objects with the provided strings and generated IDs.
 * @param {string[]} array - Array of strings to which IDs will be added.
 * @returns {Object[]} - Array of objects with 'id' and 'name' properties.
 */
export const addIdToItems = (array) => array.map((item) => ({ id: uuid4(), name: item }));
