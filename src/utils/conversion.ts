import lodash from 'lodash';

export function camelToSnake(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(item => camelToSnake(item)); // Recursively apply to each item in the array
  } else if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
    const snakeCasedObj = lodash.mapKeys(obj, (v, k) => lodash.snakeCase(k));
    
    // Recursively apply camelToSnake to the values of the object
    for (const key in snakeCasedObj) {
      if (snakeCasedObj.hasOwnProperty(key)) {
        snakeCasedObj[key] = camelToSnake(snakeCasedObj[key]);
      }
    }

    return snakeCasedObj;
  } else {
    return obj;
  }
}

export function snakeToCamel(obj: any) {
  return lodash.mapKeys(obj, (v, k) => lodash.camelCase(k));
}
