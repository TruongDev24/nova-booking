import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateBankDto {
  @IsString()
  @IsNotEmpty({ message: 'Tên ngân hàng không được để trống' })
  bankName: string;

  @IsString()
  @IsNotEmpty({ message: 'Số tài khoản không được để trống' })
  bankAccountNumber: string;

  @IsString()
  @IsNotEmpty({ message: 'Tên chủ tài khoản không được để trống' })
  bankAccountName: string;
}
