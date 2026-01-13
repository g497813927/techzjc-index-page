import './Publications.css';
//eslint-disable-next-line
export function Publications(props: {dict: any}) {
    return (
        <div className='container publication-section'>
            <h1>{props.dict['publications']['title']}</h1>
            <ul>
                <li>
                    <div>Oh, S., <b>Zhao, J.</b>, Russo, C., Bolmer, M., Jeong, J., Fan, J., Cao, Y., Wang, W. L., Andrus, N., & McCrickard, S. (2025). Optimizing Diary Studies Learning Outcomes with Fine-Tuned Large Language Models on the Diaryquest Platform. 2025 IEEE Frontiers in Education Conference (FIE), 1–9. <a href="https://doi.org/10.1109/FIE63693.2025.11328660">https://doi.org/10.1109/FIE63693.2025.11328660</a></div>
                </li>
                <li>
                    <div>Fan, J., <b>Zhao, J.</b>, Oh, S., Bolmer, M., Lee, Y., Flammer, N., Chen, Y., & McCrickard, D. S. (2025). Structuring Collaborative Reflection: Integrating Diary Study and Focus Group Discussion. Companion Publication of the 2025 Conference on Computer-Supported Cooperative Work and Social Computing, 244–248. <a href="https://doi.org/10.1145/3715070.3749233">https://doi.org/10.1145/3715070.3749233</a></div>
                </li>
                <li>
                    <div>Oh, S., <b>Zhao, J.</b>, Russo, C., & Bolmer, M. (2025). Boosting Diary Study Outcomes with a Fine-Tuned Large Language Model. Proceedings of the Extended Abstracts of the CHI Conference on Human Factors in Computing Systems, 1–7. <a href="https://doi.org/10.1145/3706599.3719287">https://doi.org/10.1145/3706599.3719287</a></div>
                </li>
                <li>
                    <div><b>Zhao, J.</b>, Horrall, J., Gaudian, W., Jordan, P., Chavan, P., Rana, A., & Snr, Y. (2025). DiaryQuest: A Web-Based Learning System Utilizing Diary Study. Proceedings of the 56th ACM Technical Symposium on Computer Science Education V. 2, 1765. <a href="https://doi.org/10.1145/3641555.3705023">https://doi.org/10.1145/3641555.3705023</a></div>
                </li>
            </ul>
        </div>
    )
}
