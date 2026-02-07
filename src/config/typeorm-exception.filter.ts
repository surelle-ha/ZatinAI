import { ExceptionFilter, Catch, ArgumentsHost, BadRequestException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { FastifyReply } from 'fastify';

@Catch(QueryFailedError)
export class TypeOrmExceptionFilter implements ExceptionFilter {
  catch(exception: QueryFailedError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();

    const errorCode = (exception.driverError as any)?.code;

    let status = 500;
    let message = 'Database error';

    switch (errorCode) {
      case '23505':
      case 'ER_DUP_ENTRY':
        status = 400;
        message = 'Duplicate entry';
        break;
      case '23503':
      case 'ER_NO_REFERENCED_ROW':
        status = 400;
        message = 'Invalid reference';
        break;
      case '23502':
        status = 400;
        message = 'Required field missing';
        break;
    }

    response.status(status).send({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      error: exception.message,
    });
  }
}
