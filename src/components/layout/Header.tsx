import type { Locale } from '../../i18n-config';
import { getDictionary } from '@/lib/get-dictionary';
import HeaderClient from './HeaderClient';

export default async function Header({ lang }: { lang: Locale }) {
    const dict = await getDictionary(lang);
    return <HeaderClient lang={lang} dict={dict} />;
}
