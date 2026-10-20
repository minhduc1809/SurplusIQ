import { Matches } from 'class-validator';

/** Mật khẩu mới: tối thiểu 8 ký tự, có ít nhất một chữ và một số. Không áp cho đăng nhập. */
export const IsStrongPassword = () =>
  Matches(/^(?=.*[A-Za-z])(?=.*\d).{8,}$/, {
    message: 'Mật khẩu tối thiểu 8 ký tự, gồm cả chữ và số',
  });
