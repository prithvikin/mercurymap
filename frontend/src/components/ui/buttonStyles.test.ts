import { button } from './buttonStyles.ts';

describe('button', () => {
  it('combines the default primary medium styles', () => {
    const classes = button();

    expect(classes).toContain('bg-indigo-600');
    expect(classes).toContain('text-white');
    expect(classes).toContain('rounded-lg px-4 py-2 text-sm');
  });

  it('composes the requested variant and size with caller classes', () => {
    const classes = button('danger', 'lg', 'w-full');

    expect(classes).toContain('bg-white text-red-600 border border-slate-300 hover:bg-red-50');
    expect(classes).toContain('rounded-xl px-6 py-3 text-base');
    expect(classes).toContain('w-full');
  });

  it.each([
    ['secondary', 'sm', 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50', 'rounded-lg px-3 py-1.5 text-sm'],
    ['ghost', 'md', 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900', 'rounded-lg px-4 py-2 text-sm'],
  ] as const)('supports the %s/%s combination', (variant, size, variantClasses, sizeClasses) => {
    const classes = button(variant, size);

    expect(classes).toContain(variantClasses);
    expect(classes).toContain(sizeClasses);
  });
});
