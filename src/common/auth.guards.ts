import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { userFromAuthorizationHeader } from './demo-users.js';
import type { GraphqlContext } from './graphql-context.js';
import { LibraryRole } from './library-role.js';
import type { LibraryUser } from './library-user.model.js';

/**
 * Queries stay public so the first examples work with no header.
 * Mutations and the upload route opt in by adding one of these guards.
 */
@Injectable()
export class LibraryAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (!userFromExecution(context)) {
      throw new UnauthorizedException(
        'Send Authorization: Bearer reader-token or Bearer librarian-token',
      );
    }
    return true;
  }
}

@Injectable()
export class LibrarianGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = userFromExecution(context);
    if (!user) {
      throw new UnauthorizedException(
        'Send Authorization: Bearer librarian-token',
      );
    }
    if (user.role !== LibraryRole.LIBRARIAN) {
      throw new ForbiddenException('This action requires the librarian role');
    }
    return true;
  }
}

function userFromExecution(context: ExecutionContext): LibraryUser | null {
  if (context.getType() === 'http') {
    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
    }>();
    return userFromAuthorizationHeader(request.headers.authorization);
  }
  return GqlExecutionContext.create(context).getContext<GraphqlContext>().user;
}
