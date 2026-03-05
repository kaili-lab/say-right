import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, vi } from 'vitest';

import App from './App';

const mockFetch = vi.fn<typeof fetch>();

describe('auth-ui', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    mockFetch.mockReset();
    vi.unstubAllGlobals();
  });

  it('应支持注册表单校验与提交', async () => {
    const user = userEvent.setup();

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ user: { id: 'user-001', email: 'kai@example.com' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', mockFetch);

    render(
      <MemoryRouter initialEntries={['/auth/register']}>
        <App />
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: '注册' });
    await user.click(screen.getByRole('button', { name: '注册' }));
    expect(screen.getByRole('alert')).toHaveTextContent('请输入邮箱和密码');

    await user.type(screen.getByLabelText('邮箱'), 'kai@example.com');
    await user.type(screen.getByLabelText('密码'), 'password123');
    await user.click(screen.getByRole('button', { name: '注册' }));

    expect(await screen.findByText('注册成功，请前往登录。')).toBeInTheDocument();
    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith(
        'http://127.0.0.1:8787/api/auth/sign-up/email',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
        }),
      ),
    );
  });

  it('应支持登录并写入会话标记', async () => {
    const user = userEvent.setup();

    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          user: {
            id: 'user-001',
            email: 'kai@example.com',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          display_name: 'Kai',
          insight: '每天复习一点点，记得更久。',
          study_days: 0,
          mastered_count: 0,
          total_cards: 0,
          total_due: 0,
          recent_decks: [],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', mockFetch);

    render(
      <MemoryRouter initialEntries={['/auth/login']}>
        <App />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText('邮箱'), 'kai@example.com');
    await user.type(screen.getByLabelText('密码'), 'password123');
    await user.click(screen.getByRole('button', { name: '登录' }));

    await screen.findByRole('heading', { name: '今日待复习' });
    expect(window.localStorage.getItem('say_right_session_active')).toBe('1');
    expect(window.localStorage.getItem('say_right_user_email')).toBe('kai@example.com');
    expect(window.localStorage.getItem('say_right_access_token')).toBeNull();
    expect(window.localStorage.getItem('say_right_refresh_token')).toBeNull();
  });

  it('应支持头像下拉菜单与退出登录', async () => {
    const user = userEvent.setup();

    window.localStorage.setItem('say_right_session_active', '1');
    window.localStorage.setItem('say_right_user_email', 'kai@example.com');
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          display_name: 'Kai',
          insight: '每天复习一点点，记得更久。',
          study_days: 0,
          mastered_count: 0,
          total_cards: 0,
          total_due: 0,
          recent_decks: [],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', mockFetch);

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: '用户菜单' }));
    expect(await screen.findByRole('menu')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: '账号信息' })).toBeInTheDocument();

    await user.click(screen.getByRole('menuitem', { name: '退出登录' }));

    expect(window.localStorage.getItem('say_right_session_active')).toBeNull();
    expect(window.localStorage.getItem('say_right_user_email')).toBeNull();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: '登录' })).toBeInTheDocument();
    expect(await screen.findByRole('status')).toHaveTextContent('已退出登录。');
  });
});
