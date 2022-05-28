import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { IGqlCtx } from '../../common/interfaces/gql-ctx.interface';
import { GqlExecutionContext } from '@nestjs/graphql';
import { IExtendedRequest } from '../interfaces/extended-request.interface';
import { RoleEnum } from '../../users/enums/role.enum';

@Injectable()
export class PublisherGuard implements CanActivate {
  public canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const gqlCtx: IGqlCtx = GqlExecutionContext.create(context).getContext();
    const user =
      (gqlCtx.reply?.request as IExtendedRequest)?.user ?? gqlCtx?.ws;

    if (!user) return false;

    return user.role !== RoleEnum.USER;
  }
}
