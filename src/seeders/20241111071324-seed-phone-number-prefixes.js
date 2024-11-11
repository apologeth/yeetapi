'use strict';
const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const data = [];
    const INDOSAT_PREFIXES = '0814,0815,0816,0855,0856,0857,0858';
    const XL_PREFIXES = '0817,0818,0819,0859,0878,0877';
    const AXIS_PREFIXES = '0838,0837,0831,0832';
    const TELKOMSEL_PREFIXES = '0812,0813,0852,0853,0821,0823,0822,0851';
    const SMARTFREN_PREFIXES = '0881,0882,0883,0884, 0885,0886,0887,0888';
    const THREE_PREFIXES = '0896,0897,0898,0899,0895';
    const BYU_PREFIXES = '085154,085155,085156,085157,085158';

    INDOSAT_PREFIXES.split(',').forEach((prefix) =>
      data.push({
        id: uuidv4(),
        prefix,
        pulsa_operator: 'indosat',
        data_operator: 'indosat_paket_internet',
        created_at: new Date(),
        updated_at: new Date(),
      }),
    );
    XL_PREFIXES.split(',').forEach((prefix) =>
      data.push({
        id: uuidv4(),
        prefix,
        pulsa_operator: 'xl',
        data_operator: 'xl_paket_internet',
        created_at: new Date(),
        updated_at: new Date(),
      }),
    );
    AXIS_PREFIXES.split(',').forEach((prefix) =>
      data.push({
        id: uuidv4(),
        prefix,
        pulsa_operator: 'axis',
        data_operator: 'axis_paket_internet',
        created_at: new Date(),
        updated_at: new Date(),
      }),
    );
    TELKOMSEL_PREFIXES.split(',').forEach((prefix) =>
      data.push({
        id: uuidv4(),
        prefix,
        pulsa_operator: 'telkomsel',
        data_operator: 'telkomsel',
        created_at: new Date(),
        updated_at: new Date(),
      }),
    );
    SMARTFREN_PREFIXES.split(',').forEach((prefix) =>
      data.push({
        id: uuidv4(),
        prefix,
        pulsa_operator: 'smartfren',
        data_operator: 'smartfren_paket_internet',
        created_at: new Date(),
        updated_at: new Date(),
      }),
    );
    THREE_PREFIXES.split(',').forEach((prefix) =>
      data.push({
        id: uuidv4(),
        prefix,
        pulsa_operator: 'three',
        data_operator: 'tri_paket_internet',
        created_at: new Date(),
        updated_at: new Date(),
      }),
    );
    BYU_PREFIXES.split(',').forEach((prefix) =>
      data.push({
        id: uuidv4(),
        prefix,
        pulsa_operator: 'by.U',
        data_operator: null,
        created_at: new Date(),
        updated_at: new Date(),
      }),
    );
    await queryInterface.bulkInsert('phone_number_prefixes', data, {});
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('product_types', null, {});
  },
};
