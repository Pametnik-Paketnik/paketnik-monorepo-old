import { ApiProperty } from '@nestjs/swagger';

export class SetupTotpResponseDto {
  @ApiProperty({
    description: 'The TOTP secret key (base32 encoded)',
    example: 'JBSWY3DPEHPK3PXP',
  })
  secret: string;

  @ApiProperty({
    description: 'The QR code URI for authenticator apps',
    example:
      'otpauth://totp/MyApp:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=MyApp',
  })
  qrCodeUri: string;

  @ApiProperty({
    description: 'Manual entry key for authenticator apps',
    example: 'JBSWY3DPEHPK3PXP',
  })
  manualEntryKey: string;
}
