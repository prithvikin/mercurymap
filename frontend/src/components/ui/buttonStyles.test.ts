import { button } from './buttonStyles.ts';

describe('button', () => {
  it('combines the default primary medium styles', () => {
    const classes = button();

    expect(classes).toContain('bg-clay-600');
    expect(classes).toContain('text-white');
    expect(classes).toContain('rounded-xl px-4 py-2 text-sm');
  });

  it('composes the requested variant and size with caller classes', () => {
    const classes = button('danger', 'lg', 'w-full');

    expect(classes).toContain('bg-white text-berry-600 border border-sand-300 hover:bg-berry-50');
    expect(classes).toContain('rounded-2xl px-6 py-3 text-base');
    expect(classes).toContain('w-full');
  });

  it.each([
    ['secondary', 'sm', 'bg-white text-sand-700 border border-sand-300 hover:bg-sand-50', 'rounded-lg px-3 py-1.5 text-sm'],
    ['ghost', 'md', 'bg-transparent text-sand-600 hover:bg-sand-100 hover:text-sand-900', 'rounded-xl px-4 py-2 text-sm'],
  ] as const)('supports the %s/%s combination', (variant, size, variantClasses, sizeClasses) => {
    const classes = button(variant, size);

    expect(classes).toContain(variantClasses);
    expect(classes).toContain(sizeClasses);
  });
});
