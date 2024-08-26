import { Request, Response } from 'express';
import { sequelize } from '../config/database';
import { createErrorResponse, createSuccessResponse } from './create-response';
import { Transaction as DBTransaction } from 'sequelize';

export async function createRequestProcessor(params: {
  request: Request;
  response: Response;
  functionToExecute: (
    request: Request,
    dbTransaction?: DBTransaction,
  ) => Promise<any>;
  opts: { useDBTransaction: boolean; context: string };
}) {
  const { request, response, functionToExecute, opts } = params;
  let dbTransaction;
  if (opts?.useDBTransaction) {
    dbTransaction = await sequelize.transaction();
  }

  try {
    const result = await functionToExecute(request, dbTransaction);
    await dbTransaction?.commit();
    createSuccessResponse(response, result);
  } catch (error: any) {
    await dbTransaction?.rollback();
    console.log(`Error to execute ${opts.context}, message: ${error.message}`);
    createErrorResponse(response, error);
  }
}
