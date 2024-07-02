import lodash from 'lodash';

export function camelToSnake(obj: any) {
  return lodash.mapKeys(obj, (v, k) => lodash.snakeCase(k));
}

export function snakeToCamel(obj: any) {
  return lodash.mapKeys(obj, (v, k) => lodash.camelCase(k));
}
