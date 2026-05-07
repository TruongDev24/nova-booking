import { Global, Module } from '@nestjs/common';
import { NotificationGateway } from './notification.gateway';

@Global() // Make it global so we can inject the gateway into any service easily
@Module({
  providers: [NotificationGateway],
  exports: [NotificationGateway],
})
export class NotificationModule {}
