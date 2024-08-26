import lodash from 'lodash';

export function camelToSnake(obj: any): any {
  const hasOwnProperty = Object.prototype.hasOwnProperty;

  if (Array.isArray(obj)) {
    return obj.map((item) => camelToSnake(item)); // Recursively apply to each item in the array
  } else if (obj instanceof Date) {
    return obj; // Return Date objects as is
  } else if (obj !== null && typeof obj === 'object') {
    const snakeCasedObj = lodash.mapKeys(obj, (v, k) => lodash.snakeCase(k));

    // Recursively apply camelToSnake to the values of the object
    for (const key in snakeCasedObj) {
      if (hasOwnProperty.call(snakeCasedObj, key)) {
        snakeCasedObj[key] = camelToSnake(snakeCasedObj[key]);
      }
    }

    return snakeCasedObj;
  } else {
    return obj; // Return the value as is for primitives
  }
}

export function snakeToCamel(obj: any) {
  return lodash.mapKeys(obj, (v, k) => lodash.camelCase(k));
}
